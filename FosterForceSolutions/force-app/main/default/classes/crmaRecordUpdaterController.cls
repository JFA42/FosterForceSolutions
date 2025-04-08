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
}
