public with sharing class crmaUpdaterController {
    public crmaUpdaterController() {
        @AuraEnabled
        public static List<SObject> getRecordsFromLens(String lensIds) {
            List<String> lensIdList = lensIds.split(',');
            List<SObject> records = new List<SObject>();
            
            // Query the lens records to get the associated record IDs
            List<InsightsExternalData> lensData = [
                SELECT Id, ExternalDataId 
                FROM InsightsExternalData 
                WHERE Id IN :lensIdList
            ];
            
            Set<Id> recordIds = new Set<Id>();
            for (InsightsExternalData lens : lensData) {
                recordIds.add(lens.ExternalDataId);
            }
            
            // Get the object type from the first record
            if (!recordIds.isEmpty()) {
                String objectType = recordIds.iterator().next().getSObjectType().getDescribe().getName();
                String query = 'SELECT Id, Name FROM ' + objectType + ' WHERE Id IN :recordIds';
                records = Database.query(query);
            }
            
            return records;
        }
        
        @AuraEnabled
        public static List<FieldInfo> getAvailableFields(String objectApiName) {
            List<FieldInfo> fields = new List<FieldInfo>();
            Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe()
                .get(objectApiName)
                .getDescribe()
                .fields.getMap();
                
            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult field = fieldMap.get(fieldName).getDescribe();
                if (field.isUpdateable() && !field.isCalculated()) {
                    fields.add(new FieldInfo(field));
                }
            }
            
            return fields;
        }
        
        public class FieldInfo {
            @AuraEnabled public String label;
            @AuraEnabled public String apiName;
            @AuraEnabled public String type;
            
            public FieldInfo(Schema.DescribeFieldResult field) {
                this.label = field.getLabel();
                this.apiName = field.getName();
                this.type = String.valueOf(field.getType());
            }
        }
    }
}