using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity Attachments as projection on whc.Attachments;
    entity ContractCustomers as projection on whc.ContractCustomers;

    entity ContractsView as select from Contracts as contract {
        *,
        contract.ContractType.Type,
        contract.Status.Status,
        contract.ContractCustomers.Name as ParentAccountName: String,
        contract.ContractCustomers.IsParent
    };

    entity ContractFormView as select from Contracts as contract {
        *
    };

    entity WHCProducts as projection on whc.WHCProducts;

    entity Discounts as projection on whc.Discounts;
    entity Rebates as projection on whc.Rebates;
    entity DiscountTableView {
        Key Contracts_ID: UUID;
        Key Year: Integer;
        DiscountID: UUID;
        Units: Integer;
        Mirena: String;
        Kyleena: String;
        Skyla: String;
    }
}