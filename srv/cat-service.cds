using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity ContractsHistory as projection on whc.Contracts_History;
    entity Attachments as projection on whc.Attachments;
    entity ContractCustomers as projection on whc.ContractCustomers;

    entity ContractsView as select from Contracts {
        key ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as ContractsViewID:String,
        ID,
        ValidFrom,
        ValidTo,
        Name,
        BackgroundInfo,
        VistexID,
        StatusID,
        TypeID,
        Remarks,
        BaseLineUnits,
        BaseLineDiscount,
        ProposedContractLength,
        ContractType.Type,
        Status.StatusText as Status,
        ContractCustomers.Name as ParentAccountName: String,
        ContractCustomers.IsParent,
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from ContractsHistory {
         key ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as ContractsViewID:String,
        ID,
        ValidFrom,
        ValidTo,
        Name,
        BackgroundInfo,
        VistexID,
        StatusID,
        TypeID,
        Remarks,
        BaseLineUnits,
        BaseLineDiscount,
        ProposedContractLength,
        ContractType.Type,
        Status.StatusText as Status,
        ContractCustomers.Name as ParentAccountName: String,
        ContractCustomers.IsParent,
        false as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    } where Status.StatusText = 'Approved';

    entity ContractFormView as select from Contracts as contract {
        *
    };

    entity WHCProducts as projection on whc.WHCProducts;

    entity Discounts as projection on whc.Discounts;
    entity Rebates as projection on whc.Rebates;
    entity RebatesHistory as projection on whc.Rebates_History;
    entity DiscountTableView {
        Key ContractID: UUID;
        Key Year: Integer;
        DiscountID: UUID;
        Units: Integer;
        Mirena: String;
        Kyleena: String;
        Skyla: String;
    }

    entity RebatesView as select from Rebates {
        key ID,
        key ValidFrom,
        key ValidTo,
        Year,
        Level,
        Unit,
        Discount,
        RebateLevels,
        ContractID,
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from RebatesHistory {
        ID,
        ValidFrom,
        ValidTo,
        Year,
        Level,
        Unit,
        Discount,
        RebateLevels,
        ContractID,
        false as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy  
    } where Contract.Status.StatusText = 'Approved';
}