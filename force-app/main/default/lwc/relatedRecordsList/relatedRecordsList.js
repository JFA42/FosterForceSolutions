import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import updateRecords from '@salesforce/apex/RelatedRecordsController.updateRecords';

export default class RelatedRecordsList extends LightningElement {
    @api objectApiName;
    @api maxRecords = 100;
    
    records = [];
    error;
    isLoading = false;
    showConfigModal = false;
    selectedFields = [];
    fieldLabels = {};

    get showEmptyState() {
        return !this.isLoading && (!this.records || this.records.length === 0);
    }

    get showRecords() {
        return !this.isLoading && this.records && this.records.length > 0;
    }

    get isMassUpdateDisabled() {
        return !this.records || this.records.length === 0 || this.isLoading;
    }

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;

    // Handle data refresh from dashboard
    @api
    handleDataRefresh(data) {
        if (!data || !data.result || !data.result.rows) {
            this.records = [];
            return;
        }

        const rows = data.result.rows;
        const recordIds = rows
            .map(row => {
                const recordIdIndex = data.result.metadata.columns.findIndex(col => col.name === 'Record Id');
                return recordIdIndex !== -1 ? row[recordIdIndex] : null;
            })
            .filter(id => id && typeof id === 'string')
            .slice(0, this.maxRecords);

        if (recordIds.length === 0) {
            this.records = [];
            return;
        }

        this.loadRecords(recordIds);
    }

    // Load records based on Record Ids
    async loadRecords(recordIds) {
        this.isLoading = true;
        try {
            if (!this.selectedFields.length) {
                this.records = [];
                return;
            }

            const fields = this.selectedFields.map(field => `${this.objectApiName}.${field}`);
            const records = await Promise.all(
                recordIds.map(recordId => 
                    getRecord({ recordId, fields })
                        .then(result => result)
                        .catch(() => null)
                )
            );

            this.records = records.filter(record => record !== null);
            
            if (this.objectInfo.data) {
                this.fieldLabels = this.selectedFields.reduce((acc, field) => {
                    acc[field] = this.objectInfo.data.fields[field].label;
                    return acc;
                }, {});
            }
        } catch (error) {
            this.error = error;
            this.showToast('Error', error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleFieldConfig() {
        this.showConfigModal = true;
    }

    handleConfigSave(event) {
        this.selectedFields = event.detail.selectedFields;
        this.showConfigModal = false;
        // Reload records with new field selection
        if (this.records.length > 0) {
            this.loadRecords(this.records.map(record => record.id));
        }
    }

    handleConfigCancel() {
        this.showConfigModal = false;
    }

    async handleMassUpdate() {
        if (this.records.length > this.maxRecords) {
            this.showToast('Error', `Cannot update more than ${this.maxRecords} records at once`, 'error');
            return;
        }

        try {
            const updates = this.records.map(record => ({
                Id: record.id,
                ...this.selectedFields.reduce((acc, field) => {
                    acc[field] = record.fields[field].value;
                    return acc;
                }, {})
            }));

            const result = await updateRecords({ 
                objectApiName: this.objectApiName,
                records: updates 
            });
            
            if (result.success) {
                this.showToast('Success', 'Records updated successfully', 'success');
                this.loadRecords(this.records.map(record => record.id));
            } else {
                this.showToast('Error', result.message, 'error');
            }
        } catch (error) {
            this.showToast('Error', error.body?.message || error.message, 'error');
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
} 