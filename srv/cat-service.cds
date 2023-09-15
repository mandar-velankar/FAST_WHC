using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity ContractsHistory as projection on whc.Contracts_History;
    entity Attachments as projection on whc.Attachments;
    entity ContractCustomers as projection on whc.ContractCustomers;
    entity ContractCustomersHistory as projection on whc.ContractCustomers_History;
    entity WHCProducts as projection on whc.WHCProducts;
    entity Discounts as projection on whc.Discounts;
    entity Rebates as projection on whc.Rebates;
    entity RebatesHistory as projection on whc.Rebates_History;

    entity ContractsView as select from Contracts {
        key ID || '-' || replace(TO_NVARCHAR(ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
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
        ContractCustomers: redirected to ContractCustomers,
        @Core.Computed: false
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from ContractsHistory {
        key ID || '-' || replace(TO_NVARCHAR(ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
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
        ContractCustomers: redirected to ContractCustomersHistory,
        @Core.Computed: false
        false as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    } where Status.StatusText = 'Approved';

    entity ContractFormView as select from Contracts as contract {
        *
    };

    entity DiscountsView {
        key ContractsViewID:String;
        Key Year: Integer;
        key isCurrent: Boolean default true;
        ContractID: UUID;
        DiscountID: UUID;
        Units: Integer;
        Mirena: String;
        Kyleena: String;
        Skyla: String;
        ContractValidFrom: Timestamp;
        ContractValidTo: Timestamp;
    }


    entity MostRecentRebatesHistoryIDs as select from RebatesHistory
    {
        key ID,
        max(ValidTo) as MaxValidTo:Date
    }group by ID;

    entity RebatesView as select from Rebates {
        key ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as RebatesViewID:String,
        ID,
        ValidFrom,
        ValidTo,
        Year,
        Level,
        Unit,
        Discount,
        RebateLevels,
        ContractID,
        Contract.ValidFrom as ContractValidFrom: Timestamp,
        Contract.ValidTo as ContractValidTo: Timestamp,
        ContractID || '-' || replace(Contract.ValidFrom, ' ', '-') || '-' || replace(Contract.ValidTo, ' ', '-') as ContractsViewID:String,
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from MostRecentRebatesHistoryIDs as mh
    left outer join RebatesHistory as r on mh.ID = r.ID and mh.MaxValidTo = r.ValidTo{
        key r.ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as RebatesViewID:String,
        r.ID,
        ValidFrom,
        ValidTo,
        Year,
        Level,
        Unit,
        Discount,
        RebateLevels,
        ContractID,
        Contract.ValidFrom as ContractValidFrom: Timestamp,
        Contract.ValidTo as ContractValidTo: Timestamp,
        ContractID || '-' || replace(Contract.ValidFrom, ' ', '-') || '-' || replace(Contract.ValidTo, ' ', '-') as ContractsViewID:String,
        false as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy  
    } where Contract.Status.StatusText = 'Approved';



    entity MostRecentContractCustomersIDs as select from ContractCustomersHistory
    {
        key ID,
        max(ValidTo) as MaxValidTo:Date
    }group by ID;


    entity ContractCustomersView as select from ContractCustomers {
        key ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as ContractCustomerViewID:String,
        ID,
        ValidFrom,
        ValidTo,
        BHOID,
        Name,
        ContractID,
        IsParent,
        Contract.ValidFrom as ContractValidFrom: Timestamp,
        Contract.ValidTo as ContractValidTo: Timestamp,
        ContractID || '-' || replace(Contract.ValidFrom, ' ', '-') || '-' || replace(Contract.ValidTo, ' ', '-') as ContractsViewID:String,
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from MostRecentContractCustomersIDs as mcc
    left outer join ContractCustomersHistory as c on mcc.ID = c.ID and mcc.MaxValidTo = c.ValidTo{
        key c.ID || '-' || replace(ValidFrom, ' ', '-') || '-' || replace(ValidTo, ' ', '-') as ContractCustomerViewID:String,
        c.ID,
        ValidFrom,
        ValidTo,
        BHOID,
        Name,
        ContractID,
        IsParent,
        Contract.ValidFrom as ContractValidFrom: Timestamp,
        Contract.ValidTo as ContractValidTo: Timestamp,
        ContractID || '-' || replace(Contract.ValidFrom, ' ', '-') || '-' || replace(Contract.ValidTo, ' ', '-') as ContractsViewID:String,
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    } where Contract.Status.StatusText = 'Approved';
    entity DiscountProducts as projection on whc.DiscountProducts;
}