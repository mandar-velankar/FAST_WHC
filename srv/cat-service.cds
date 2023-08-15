using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity ContractCustomers as projection on whc.ContractCustomers;

    entity ContractsView as select from Contracts {
        Name,
        ContractType.Type,
        Status.Status,
        modifiedBy,
        modifiedAt,
        createdBy,
        createdAt
    }
    group by 
        Name,
        ContractType.Type,
        Status.Status,
        modifiedBy,
        modifiedAt,
        createdBy,
        createdAt
}