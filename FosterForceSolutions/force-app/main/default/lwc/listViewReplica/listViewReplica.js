import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { exportCSVFile } from 'lightning/export';
import { NavigationMixin } from 'lightning/navigation';
import getRecords from '@salesforce/apex/ListViewController.getRecords';
import getColumnDefinitions from '@salesforce/apex/ListViewController.getColumnDefinitions';
import getMassUpdateFields from '@salesforce/apex/ListViewController.getMassUpdateFields';
import updateRecords from '@salesforce/apex/ListViewController.updateRecords';
import { getDataset } from 'lightning/analyticsWaveApi';

export default class ListViewReplica extends NavigationMixin(LightningElement) {
    @api objectApiName;
    @api listViewId;
    @api recordId;
    @api filterField;
    @api filterValue;
    @api dashboardFilter;
    @api lensFilter;
    @api timeRange;
    @api groupBy;
    @api aggregation;
    @api datasetName;
    @api recordIdField;
    @api datasetFilter;
    
    @track records = [];
    @track columns = [];
    @track sortedBy;
    @track sortedDirection = 'asc';
    @track searchTerm = '';
    @track currentPage = 1;
    @track pageSize = 50;
    @track totalRecords = 0;
    @track showColumnSettings = false;
    @track columnOptions = [];
    @track selectedColumns = [];
    @track selectedRecords = [];
    @track showMassUpdateModal = false;
    @track massUpdateFields = [];
    @track massUpdateValues = {};
    @track additionalFilter = '';
    @track datasetRecordIds = [];
    
    connectedCallback() {
        this.initializeFilters();
        if (this.datasetName && this.recordIdField) {
            this.loadDatasetRecords();
        }
    }
    
    async loadDatasetRecords() {
        try {
            const dataset = await getDataset({
                name: this.datasetName,
                version: 'latest'
            });
            
            if (dataset && dataset.data) {
                // Apply dataset filter if provided
                let filteredData = dataset.data;
                if (this.datasetFilter) {
                    filteredData = this.filterDatasetData(dataset.data, this.datasetFilter);
                }
                
                // Extract record IDs from the specified field
                this.datasetRecordIds = filteredData.map(record => record[this.recordIdField]);
                
                // Update the additional filter to include these record IDs
                this.updateRecordIdFilter();
            }
        } catch (error) {
            this.showToast('Error', 'Failed to load dataset: ' + error.message, 'error');
        }
    }
    
    filterDatasetData(data, filter) {
        // Implement dataset filtering logic based on the filter expression
        // This is a simple example - you might need more complex filtering
        return data.filter(record => {
            try {
                return eval(filter); // Be careful with eval - consider a safer alternative
            } catch (e) {
                console.error('Error applying dataset filter:', e);
                return true;
            }
        });
    }
    
    updateRecordIdFilter() {
        if (this.datasetRecordIds.length > 0) {
            const recordIdFilter = `Id IN ('${this.datasetRecordIds.join("','")}')`;
            this.additionalFilter = this.additionalFilter 
                ? `${this.additionalFilter} AND ${recordIdFilter}`
                : recordIdFilter;
        }
    }
    
    initializeFilters() {
        let filters = [];
        
        if (this.recordId) {
            filters.push(`Id = '${this.recordId}'`);
        }
        
        if (this.filterField && this.filterValue) {
            filters.push(`${this.filterField} = '${this.filterValue}'`);
        }
        
        if (this.dashboardFilter) {
            filters.push(this.dashboardFilter);
        }
        
        if (this.lensFilter) {
            filters.push(this.lensFilter);
        }
        
        if (this.timeRange) {
            filters.push(this.timeRange);
        }
        
        if (filters.length > 0) {
            this.additionalFilter = filters.join(' AND ');
        }
    }
    
    // Handle parameter changes
    @api
    handleParameterChange(parameterName, parameterValue) {
        switch(parameterName) {
            case 'dashboardFilter':
                this.dashboardFilter = parameterValue;
                break;
            case 'lensFilter':
                this.lensFilter = parameterValue;
                break;
            case 'timeRange':
                this.timeRange = parameterValue;
                break;
            case 'groupBy':
                this.groupBy = parameterValue;
                break;
            case 'aggregation':
                this.aggregation = parameterValue;
                break;
            case 'datasetName':
                this.datasetName = parameterValue;
                this.loadDatasetRecords();
                break;
            case 'recordIdField':
                this.recordIdField = parameterValue;
                this.loadDatasetRecords();
                break;
            case 'datasetFilter':
                this.datasetFilter = parameterValue;
                this.loadDatasetRecords();
                break;
        }
        this.refreshRecords();
    }
    
    get totalPages() {
        return Math.ceil(this.totalRecords / this.pageSize);
    }
    
    get isFirstPage() {
        return this.currentPage === 1;
    }
    
    get isLastPage() {
        return this.currentPage === this.totalPages;
    }

    @wire(getColumnDefinitions, { objectApiName: '$objectApiName', listViewId: '$listViewId' })
    wiredColumns({ error, data }) {
        if (data) {
            this.columns = data;
            this.columnOptions = data.map(column => ({
                label: column.label,
                value: column.fieldName
            }));
            this.selectedColumns = data.map(column => column.fieldName);
        } else if (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    @wire(getRecords, {
        objectApiName: '$objectApiName',
        listViewId: '$listViewId',
        searchTerm: '$searchTerm',
        pageNumber: '$currentPage',
        pageSize: '$pageSize',
        sortBy: '$sortedBy',
        sortDirection: '$sortedDirection',
        additionalFilter: '$additionalFilter'
    })
    wiredRecords({ error, data }) {
        if (data) {
            this.records = data.records;
            this.totalRecords = data.totalCount;
        } else if (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.currentPage = 1;
    }

    handleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    handleColumnSettings() {
        this.showColumnSettings = true;
    }

    closeColumnSettings() {
        this.showColumnSettings = false;
    }

    handleColumnSelection(event) {
        this.selectedColumns = event.detail.value;
    }

    saveColumnSettings() {
        this.columns = this.columns.filter(column => 
            this.selectedColumns.includes(column.fieldName)
        );
        this.closeColumnSettings();
    }

    handleExport() {
        const headers = this.columns.map(column => column.label);
        const fieldNames = this.columns.map(column => column.fieldName);
        
        const csvData = this.records.map(record => {
            return fieldNames.map(fieldName => record[fieldName]);
        });

        exportCSVFile(headers, csvData, `${this.objectApiName}_export`);
    }

    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        
        switch (action.name) {
            case 'view':
                this.navigateToRecord(row.Id);
                break;
            case 'edit':
                this.navigateToEdit(row.Id);
                break;
            default:
                break;
        }
    }

    handleRowSelection(event) {
        this.selectedRecords = event.detail.selectedRows;
    }

    async handleMassUpdate() {
        try {
            const fields = await getMassUpdateFields({ objectApiName: this.objectApiName });
            this.massUpdateFields = fields;
            this.showMassUpdateModal = true;
        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    handleFieldChange(event) {
        const fieldName = event.target.fieldName;
        const value = event.target.value;
        this.massUpdateValues[fieldName] = value;
    }

    async handleMassUpdateSubmit() {
        try {
            await updateRecords({
                recordIds: this.selectedRecords.map(record => record.Id),
                fieldValues: this.massUpdateValues
            });
            this.showToast('Success', 'Records updated successfully', 'success');
            this.closeMassUpdateModal();
            this.refreshRecords();
        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    handleMassUpdateSuccess() {
        this.showToast('Success', 'Records updated successfully', 'success');
        this.closeMassUpdateModal();
        this.refreshRecords();
    }

    handleMassUpdateError(event) {
        this.showToast('Error', event.detail.detail, 'error');
    }

    closeMassUpdateModal() {
        this.showMassUpdateModal = false;
        this.massUpdateValues = {};
    }

    refreshRecords() {
        // Refresh the records by re-executing the wire service
        this.currentPage = 1;
    }

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            }
        });
    }

    navigateToEdit(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'edit'
            }
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
} 