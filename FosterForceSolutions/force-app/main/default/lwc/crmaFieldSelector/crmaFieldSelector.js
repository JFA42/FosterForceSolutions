// fieldSelector.js
import { LightningElement, api } from 'lwc';

export default class crmaFieldSelector extends LightningElement {
    @api availableFields;
    selectedFields = [];

    handleSelectionChange(event) {
        this.selectedFields = event.detail.value;
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleConfirm() {
        const selectedFields = this.availableFields.filter(field => 
            this.selectedFields.includes(field.apiName)
        );
        this.dispatchEvent(new CustomEvent('fieldselection', {
            detail: { selectedFields }
        }));
    }
}