using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity ContractCustomers as projection on whc.ContractCustomers;

    entity ContractsView as select from Contracts as contract {
        *,
        contract.ContractType.Type,
        contract.Status.Status,
        contract.ContractCustomers.Name as ParentAccountName: String,
        contract.ContractCustomers.IsParent
    }
}