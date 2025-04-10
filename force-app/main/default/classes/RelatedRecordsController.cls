public with sharing class RelatedRecordsController {
    @AuraEnabled
    public static Map<String, Object> updateRecords(String objectApiName, List<Map<String, Object>> records) {
        try {
            if (records == null || records.isEmpty()) {
                return new Map<String, Object>{
                    'success' => false,
                    'message' => 'No records to update'
                };
            }

            List<SObject> recordsToUpdate = new List<SObject>();
            Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
            
            for (Map<String, Object> record : records) {
                SObject obj = objectType.newSObject();
                for (String field : record.keySet()) {
                    obj.put(field, record.get(field));
                }
                recordsToUpdate.add(obj);
            }

            Database.SaveResult[] results = Database.update(recordsToUpdate, false);
            
            List<String> errors = new List<String>();
            for (Database.SaveResult result : results) {
                if (!result.isSuccess()) {
                    for (Database.Error error : result.getErrors()) {
                        errors.add(error.getMessage());
                    }
                }
            }

            if (!errors.isEmpty()) {
                return new Map<String, Object>{
                    'success' => false,
                    'message' => String.join(errors, '\n')
                };
            }

            return new Map<String, Object>{
                'success' => true,
                'message' => 'Records updated successfully'
            };
        } catch (Exception e) {
            return new Map<String, Object>{
                'success' => false,
                'message' => e.getMessage()
            };
        }
    }
} 