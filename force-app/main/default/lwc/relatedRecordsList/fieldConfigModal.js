import { LightningElement, api } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class FieldConfigModal extends LightningElement {
    @api objectApiName;
    @api selectedFields = [];
    @api maxFields = 25;
    
    availableFields = [];
    error;
    isLoading = true;

    connectedCallback() {
        this.loadAvailableFields();
    }

    async loadAvailableFields() {
        try {
            const objectInfo = await getObjectInfo({ objectApiName: this.objectApiName });
            this.availableFields = Object.values(objectInfo.fields)
                .filter(field => field.updateable)
                .map(field => ({
                    label: field.label,
                    value: field.apiName
                }));
        } catch (error) {
            this.error = error;
        } finally {
            this.isLoading = false;
        }
    }

    handleFieldSelection(event) {
        const selectedOptions = event.detail.value;
        if (selectedOptions.length > this.maxFields) {
            // Show error message
            return;
        }
        this.selectedFields = selectedOptions;
    }

    handleSave() {
        const event = new CustomEvent('save', {
            detail: { selectedFields: this.selectedFields }
        });
        this.dispatchEvent(event);
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
} 