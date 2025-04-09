import { LightningElement, wire, api, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRecordsFromLens from '@salesforce/apex/crmaUpdaterController.getRecordsFromLens';
import getAvailableFields from '@salesforce/apex/crmaUpdaterController.getAvailableFields';

export default class crmaUpdater extends LightningElement {
    @api recordId; // Dashboard ID
    @api lensIds; // Comma-separated list of lens IDs
    
    @track records = [];
    @track selectedRecords = [];
    @track availableFields = [];
    @track selectedFields = [];
    @track fieldValues = {};
    @track isLoading = false;
    @track showFieldSelector = false;
    @track showUpdateForm = false;
    @track objectApiName;
    @track columns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Record ID', fieldName: 'Id', type: 'text' }
    ];

    // Get records when lensIds changes
    @wire(getRecordsFromLens, { lensIds: '$lensIds' })
    wiredRecords({ error, data }) {
        if (data) {
            this.records = data;
            if (data.length > 0) {
                this.objectApiName = data[0].id.substring(0, 3) === '001' ? 'Account' : 
                                   data[0].id.substring(0, 3) === '003' ? 'Contact' : 
                                   data[0].id.substring(0, 3) === '006' ? 'Opportunity' : 
                                   data[0].id.substring(0, 3) === '00Q' ? 'Lead' : null;
            }
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.records = [];
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }

    // Get available fields for the object
    @wire(getAvailableFields, { objectApiName: '$objectApiName' })
    wiredFields({ error, data }) {
        if (data) {
            this.availableFields = data.map(field => ({
                label: field.label,
                value: field.apiName
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.availableFields = [];
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }

    // Handle record selection
    handleRecordSelection(event) {
        this.selectedRecords = event.detail.selectedRows;
    }

    // Handle field selection button click
    handleFieldSelectionClick() {
        this.showFieldSelector = true;
    }

    // Handle field selection from modal
    handleFieldSelection(event) {
        this.selectedFields = event.detail.selectedFields;
        this.showFieldSelector = false;
        this.showUpdateForm = true;
        // Initialize field values
        this.fieldValues = {};
        this.selectedFields.forEach(field => {
            this.fieldValues[field.apiName] = '';
        });
    }

    // Handle field value changes
    handleFieldValueChange(event) {
        const fieldName = event.target.fieldName;
        const value = event.target.value;
        this.fieldValues[fieldName] = value;
    }

    // Update selected records
    async handleUpdate() {
        if (!this.selectedRecords.length) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please select at least one record to update',
                    variant: 'error'
                })
            );
            return;
        }

        this.isLoading = true;
        try {
            const updates = this.selectedRecords.map(record => {
                const fields = { ...record };
                Object.keys(this.fieldValues).forEach(field => {
                    if (this.fieldValues[field] !== '') {
                        fields[field] = this.fieldValues[field];
                    }
                });
                return { fields };
            });

            const results = await Promise.all(
                updates.map(update => updateRecord(update))
            );

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: `${results.length} records updated successfully`,
                    variant: 'success'
                })
            );

            // Refresh the records
            this.refreshRecords();
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }

    // Handle update success
    handleUpdateSuccess() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Records updated successfully',
                variant: 'success'
            })
        );
        this.refreshRecords();
    }

    // Refresh records
    refreshRecords() {
        // Refresh the records by re-fetching from the server
        this.records = [];
        this.selectedRecords = [];
        this.fieldValues = {};
        this.showUpdateForm = false;
        // Re-trigger the wire service
        this.lensIds = this.lensIds;
    }
}