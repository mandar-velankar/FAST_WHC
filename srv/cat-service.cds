using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService @(path: 'whc') @(requires:['f_tndr_cag_admin','f_tndr_cag_whc_user','f_tndr_cag_technical_user','authenticated-user']) {
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