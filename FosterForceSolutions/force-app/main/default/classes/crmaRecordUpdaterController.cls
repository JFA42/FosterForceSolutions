public with sharing class crmaRecordUpdaterController {
    @AuraEnabled
    public static void updateRecords(String objectApiName, List<Map<String, Object>> records) {
        if (String.isBlank(objectApiName) || records == null || records.isEmpty()) {
            throw new AuraHandledException('Invalid input parameters.');
        }

        List<SObject> sObjectsToUpdate = new List<SObject>();

        for (Map<String, Object> recordMap : records) {
            if (!recordMap.containsKey('Id')) {
                continue;
            }

            SObject sobj = (SObject) Type.forName('Schema.' + objectApiName).newInstance();

            for (String fieldName : recordMap.keySet()) {
                Object value = recordMap.get(fieldName);
                try {
                    sobj.put(fieldName, value);
                } catch (Exception e) {
                    // Skip any fields that are not writable
                    System.debug('Unable to set field: ' + fieldName + ' with error: ' + e.getMessage());
                }
            }

            sObjectsToUpdate.add(sobj);
        }

        if (!sObjectsToUpdate.isEmpty()) {
            update sObjectsToUpdate;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Field> getObjectFields(String objectApiName) {
        Schema.SObjectType objType = Schema.getGlobalDescribe().get(objectApiName);
        Map<String, Schema.SObjectField> fieldsMap = objType.getDescribe().fields.getMap();
        
        List<Field> fieldList = new List<Field>();
        for (String fieldName : fieldsMap.keySet()) {
            Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();
            fieldList.add(new Field(fieldName, fieldResult.getLabel()));
        }
        return fieldList;
    }
    
    public class Field {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;

        public Field(String apiName, String label) {
            this.apiName = apiName;
            this.label = label;
        }
    }
}
