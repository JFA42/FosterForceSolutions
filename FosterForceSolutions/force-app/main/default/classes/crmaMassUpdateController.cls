public with sharing class CRMAQueryController {

    // Method to execute CRMA query and return results as a list of maps
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> executeQuery(String crmaQuery) {
        List<Map<String, Object>> queryResults = new List<Map<String, Object>>();

        // Check if the CRMA query is valid
        if (String.isEmpty(crmaQuery)) {
            throw new AuraHandledException('Query cannot be empty.');
        }

        // Execute the dynamic SOQL query
        try {
            // Using the Dynamic SOQL feature of Apex
            List<SObject> results = Database.query(crmaQuery);
            
            // Convert results to Map for generic field access
            for (SObject record : results) {
                Map<String, Object> recordMap = new Map<String, Object>();
                for (SObjectField field : record.getSObjectType().getDescribe().fields.getMap().values()) {
                    recordMap.put(field.getDescribe().getName(), record.get(field));
                }
                queryResults.add(recordMap);
            }
        } catch (QueryException e) {
            throw new AuraHandledException('Error executing query: ' + e.getMessage());
        }

        return queryResults;
    }

    // Method to perform the mass update
    @AuraEnabled
    public static void massUpdateRecords(List<Id> recordIds, String fieldName, String newValue) {
        // Validate inputs
        if (recordIds == null || recordIds.isEmpty()) {
            throw new AuraHandledException('No records selected for update.');
        }
        if (String.isEmpty(fieldName) || String.isEmpty(newValue)) {
            throw new AuraHandledException('Field name or new value cannot be empty.');
        }

        // Dynamically update the specified field for the selected records
        try {
            List<SObject> recordsToUpdate = new List<SObject>();

            // Loop through each selected record ID
            for (Id recordId : recordIds) {
                SObject record = [SELECT Id, Name FROM SObject WHERE Id = :recordId LIMIT 1]; // Ensure to get a generic SObject, or modify according to the record type

                // Dynamically set the field value using dynamic Apex
                record.put(fieldName, newValue);
                recordsToUpdate.add(record);
            }

            // Perform the update
            update recordsToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException('Error during mass update: ' + e.getMessage());
        }
    }
}
