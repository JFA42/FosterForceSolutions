import { LightningElement, track } from 'lwc';
import executeQuery from '@salesforce/apex/CRMAQueryController.executeQuery';
import massUpdateRecords from '@salesforce/apex/CRMAQueryController.massUpdateRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CrmaQueryComponent extends LightningElement {
    @track crmaQuery = '';
    @track records = [];
    @track columns = [];
    @track availableFields = [];
    selectedRecords = [];
    fieldToUpdate = ''; // Field to update, selected dynamically by user
    newFieldValue = ''; // New value for the selected field

    // Handle user input for CRMA query
    handleQueryChange(event) {
        this.crmaQuery = event.target.value;
    }

    // Execute the query and display results
    handleExecuteQuery() {
        executeQuery({ crmaQuery: this.crmaQuery })
            .then((result) => {
                this.records = result;
                if (this.records.length > 0) {
                    // Dynamically generate columns based on fields in the result
                    this.columns = Object.keys(this.records[0]).map(field => ({
                        label: field, fieldName: field
                    }));

                    // Generate a list of fields available for update
                    this.availableFields = Object.keys(this.records[0]).map(field => ({
                        label: field, value: field
                    }));
                }
            })
            .catch((error) => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    // Handle row selection
    handleRowAction(event) {
        const selectedRows = event.detail.selectedRows;
        this.selectedRecords = selectedRows.map(row => row.Id);
    }

    // Handle the field selection change
    handleFieldSelectionChange(event) {
        this.fieldToUpdate = event.target.value;
    }

    // Handle the new value input change
    handleNewValueChange(event) {
        this.newFieldValue = event.target.value;
    }

    // Mass update selected records
    handleMassUpdate() {
        if (this.selectedRecords.length === 0) {
            this.showToast('Warning', 'No records selected for update', 'warning');
            return;
        }

        if (!this.fieldToUpdate || !this.newFieldValue) {
            this.showToast('Warning', 'Please select a field and enter a new value', 'warning');
            return;
        }

        massUpdateRecords({ recordIds: this.selectedRecords, fieldName: this.fieldToUpdate, newValue: this.newFieldValue })
            .then(() => {
                this.showToast('Success', 'Records updated successfully', 'success');
            })
            .catch((error) => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    // Show toast notifications
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }
}