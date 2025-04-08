import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import updateRecords from '@salesforce/apex/crmaRecordUpdaterController.updateRecords';

export default class crmaRecordUpdater extends LightningElement {
    @api crmaData;
    @api objectApiName;

    @track selectedFields = [];
    @track dynamicColumns = [];
    @track filteredRecords = [];
    @track draftValues = [];
    @track disableSave = true;

    allRecords = [];

    connectedCallback() {
        if (this.crmaData) {
            this.allRecords = this.crmaData;
        }
    }

    handleFieldSelection(event) {
        this.selectedFields = Array.from(event.target.selectedOptions, option => option.value);
        this.setDynamicColumns();
    }

    setDynamicColumns() {
        if (!this.selectedFields.length) {
            this.filteredRecords = [];
            this.dynamicColumns = [];
            return;
        }

        const columns = [];

        this.selectedFields.forEach(field => {
            if (field === 'Id') return;

            if (field === 'Name' && this.selectedFields.includes('Id')) {
                columns.push({
                    label: 'Name',
                    fieldName: 'linkName',
                    type: 'url',
                    typeAttributes: {
                        label: { fieldName: 'Name' },
                        target: '_blank'
                    },
                    editable: true
                });
            } else {
                columns.push({
                    label: field,
                    fieldName: field,
                    type: this.detectFieldType(field),
                    editable: true
                });
            }
        });

        if (this.selectedFields.includes('Id') && this.selectedFields.includes('Name')) {
            this.filteredRecords = this.allRecords.map(row => ({
                ...row,
                linkName: '/' + row.Id
            }));
        } else {
            this.filteredRecords = [...this.allRecords];
        }

        this.dynamicColumns = columns;
    }

    detectFieldType(fieldName) {
        if (fieldName.toLowerCase().includes('date')) return 'date';
        if (fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('price')) return 'currency';
        return 'text';
    }

    handleCellChange(event) {
        this.draftValues = event.detail.draftValues;
        this.disableSave = !this.draftValues.length;
    }

    async handleSave() {
        try {
            await updateRecords({
                objectApiName: this.objectApiName,
                records: this.draftValues
            });

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Records updated successfully!',
                variant: 'success'
            }));

            this.draftValues = [];
            this.disableSave = true;
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error updating records',
                message: error.body?.message || error.message,
                variant: 'error'
            }));
        }
    }
}