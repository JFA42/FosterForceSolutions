public with sharing class ListViewController {
    @AuraEnabled(cacheable=true)
    public static List<ColumnDefinition> getColumnDefinitions(String objectApiName, String listViewId) {
        List<ColumnDefinition> columns = new List<ColumnDefinition>();
        
        // Get the list view metadata
        ListView listView = [SELECT Id, DeveloperName, SobjectType 
                           FROM ListView 
                           WHERE Id = :listViewId 
                           AND SobjectType = :objectApiName 
                           LIMIT 1];
        
        if (listView != null) {
            // Get the field set for the list view
            List<FieldSetMember> fieldSetMembers = Schema.describeSObjects(
                new List<String>{objectApiName}
            )[0].fieldSets.getMap().get('ListViewFields').getFields();
            
            for (FieldSetMember field : fieldSetMembers) {
                ColumnDefinition column = new ColumnDefinition();
                column.label = field.getLabel();
                column.fieldName = field.getFieldPath();
                column.type = getFieldType(field.getType());
                column.sortable = true;
                columns.add(column);
            }
        }
        
        return columns;
    }
    
    @AuraEnabled(cacheable=true)
    public static QueryResult getRecords(
        String objectApiName,
        String listViewId,
        String searchTerm,
        Integer pageNumber,
        Integer pageSize,
        String sortBy,
        String sortDirection,
        String additionalFilter
    ) {
        QueryResult result = new QueryResult();
        String query = buildQuery(objectApiName, listViewId, searchTerm, sortBy, sortDirection, additionalFilter);
        
        // Add pagination
        query += ' LIMIT :pageSize OFFSET :offset';
        
        // Calculate offset
        Integer offset = (pageNumber - 1) * pageSize;
        
        // Execute query
        List<SObject> records = Database.query(query);
        
        // Get total count
        String countQuery = buildCountQuery(objectApiName, listViewId, searchTerm, additionalFilter);
        result.totalCount = Database.countQuery(countQuery);
        result.records = records;
        
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<MassUpdateField> getMassUpdateFields(String objectApiName) {
        List<MassUpdateField> fields = new List<MassUpdateField>();
        
        // Get the field set for mass update
        List<FieldSetMember> fieldSetMembers = Schema.describeSObjects(
            new List<String>{objectApiName}
        )[0].fieldSets.getMap().get('MassUpdateFields').getFields();
        
        for (FieldSetMember field : fieldSetMembers) {
            MassUpdateField massUpdateField = new MassUpdateField();
            massUpdateField.fieldName = field.getFieldPath();
            massUpdateField.label = field.getLabel();
            massUpdateField.type = getFieldType(field.getType());
            massUpdateField.required = field.getRequired();
            fields.add(massUpdateField);
        }
        
        return fields;
    }

    @AuraEnabled
    public static void updateRecords(List<String> recordIds, Map<String, Object> fieldValues) {
        if (recordIds == null || recordIds.isEmpty() || fieldValues == null || fieldValues.isEmpty()) {
            throw new AuraHandledException('No records or fields selected for update');
        }

        String objectApiName = recordIds[0].getSObjectType().getDescribe().getName();
        List<SObject> recordsToUpdate = new List<SObject>();
        
        for (String recordId : recordIds) {
            SObject record = Schema.getGlobalDescribe().get(objectApiName).newSObject(recordId);
            for (String fieldName : fieldValues.keySet()) {
                record.put(fieldName, fieldValues.get(fieldName));
            }
            recordsToUpdate.add(record);
        }
        
        try {
            update recordsToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    private static String buildQuery(
        String objectApiName,
        String listViewId,
        String searchTerm,
        String sortBy,
        String sortDirection,
        String additionalFilter
    ) {
        String query = 'SELECT Id, ';
        
        // Get field set fields
        List<FieldSetMember> fieldSetMembers = Schema.describeSObjects(
            new List<String>{objectApiName}
        )[0].fieldSets.getMap().get('ListViewFields').getFields();
        
        for (FieldSetMember field : fieldSetMembers) {
            query += field.getFieldPath() + ', ';
        }
        
        query = query.removeEnd(', ');
        query += ' FROM ' + objectApiName;
        
        // Build WHERE clause
        List<String> conditions = new List<String>();
        
        // Add search condition
        if (String.isNotBlank(searchTerm)) {
            conditions.add('Name LIKE \'%' + String.escapeSingleQuotes(searchTerm) + '%\'');
        }
        
        // Add additional filter if provided
        if (String.isNotBlank(additionalFilter)) {
            conditions.add(additionalFilter);
        }
        
        // Combine conditions
        if (!conditions.isEmpty()) {
            query += ' WHERE ' + String.join(conditions, ' AND ');
        }
        
        // Add sorting
        if (String.isNotBlank(sortBy)) {
            query += ' ORDER BY ' + sortBy + ' ' + sortDirection;
        }
        
        return query;
    }
    
    private static String buildCountQuery(
        String objectApiName,
        String listViewId,
        String searchTerm,
        String additionalFilter
    ) {
        String query = 'SELECT COUNT() FROM ' + objectApiName;
        
        // Build WHERE clause
        List<String> conditions = new List<String>();
        
        // Add search condition
        if (String.isNotBlank(searchTerm)) {
            conditions.add('Name LIKE \'%' + String.escapeSingleQuotes(searchTerm) + '%\'');
        }
        
        // Add additional filter if provided
        if (String.isNotBlank(additionalFilter)) {
            conditions.add(additionalFilter);
        }
        
        // Combine conditions
        if (!conditions.isEmpty()) {
            query += ' WHERE ' + String.join(conditions, ' AND ');
        }
        
        return query;
    }
    
    private static String getFieldType(Schema.DisplayType fieldType) {
        switch on fieldType {
            when BOOLEAN {
                return 'boolean';
            }
            when CURRENCY, DOUBLE, INTEGER, LONG, PERCENT {
                return 'number';
            }
            when DATE {
                return 'date';
            }
            when DATETIME {
                return 'date';
            }
            when EMAIL, PHONE, PICKLIST, STRING, TEXTAREA, URL {
                return 'text';
            }
            when else {
                return 'text';
            }
        }
    }
    
    public class ColumnDefinition {
        @AuraEnabled public String label;
        @AuraEnabled public String fieldName;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean sortable;
    }
    
    public class QueryResult {
        @AuraEnabled public Integer totalCount;
        @AuraEnabled public List<SObject> records;
    }

    public class MassUpdateField {
        @AuraEnabled public String fieldName;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean required;
    }
} 