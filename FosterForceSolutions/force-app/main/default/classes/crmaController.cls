public with sharing class CRMAController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getRecordsFromCRMA() {
        // Query your CRMA data or prepare a report to return as JSON
        // This is a dummy example
        List<Account> accounts = [SELECT Id, Name, Industry FROM Account LIMIT 50];
        
        List<Map<String, Object>> records = new List<Map<String, Object>>();
        for (Account acc : accounts) {
            Map<String, Object> record = new Map<String, Object>();
            record.put('Id', acc.Id);
            record.put('Name', acc.Name);
            record.put('Industry', acc.Industry);
            records.add(record);
        }
        return records;
    }

    @AuraEnabled
    public static void updateRecords(List<Map<String, Object>> updatedRecords) {
        List<Account> accountsToUpdate = new List<Account>();
        
        for (Map<String, Object> updatedRecord : updatedRecords) {
            Account acc = new Account(Id = (String) updatedRecord.get('Id'));
            acc.Name = (String) updatedRecord.get('Name');
            acc.Industry = (String) updatedRecord.get('Industry');
            accountsToUpdate.add(acc);
        }
        
        if (!accountsToUpdate.isEmpty()) {
            update accountsToUpdate;
        }
    }
}
