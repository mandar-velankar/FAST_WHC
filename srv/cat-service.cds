using com.bayer.SXTENDER.whc as whc from '../db/data-model';

service CatalogService {
    entity Contracts as projection on whc.Contracts;
    entity ContractsHistory as projection on whc.Contracts_History;
    entity Attachments as projection on whc.Attachments;
    entity ContractCustomers as projection on whc.ContractCustomers;
    entity ContractCustomersHistory as projection on whc.ContractCustomers_History;
    entity WHCProducts as projection on whc.WHCProducts;
    entity WHCStatus as projection on whc.WHCStatus;
    entity Discounts as projection on whc.Discounts;
    entity Rebates as projection on whc.Rebates;
    entity RebatesHistory as projection on whc.Rebates_History;
    entity VistexData as projection on whc.VistexData;

    entity ContractsView as select from Contracts {
        key ID || '-' || replace(TO_NVARCHAR(ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
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
        @Core.Computed: false
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from ContractsHistory {
        key ID || '-' || replace(TO_NVARCHAR(ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
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
        Mirena: Double;
        Kyleena: Double;
        Skyla: Double;
        ContractValidFrom: Timestamp;
        ContractValidTo: Timestamp;
        SelectedDiscountType: String;
    }


    entity MostRecentRebatesHistoryIDs as select from RebatesHistory
    {
        key ID,
        max(ValidTo) as MaxValidTo:Date
    }group by ID;

    entity RebatesView as select from Rebates {
        key ID || '-' || replace(TO_NVARCHAR(ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as RebatesViewID:String,
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
        ContractID || '-9999-12-31T23:59:59.999Z' as ContractsViewID:String,
        @Core.Computed: false
        true as isCurrent: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }
    union 
    select from ContractsHistory as cr
    left outer join RebatesHistory as rh on cr.ID = rh.ContractID and cr.ValidFrom = rh.ValidFrom{
        key rh.ID || '-' || replace(TO_NVARCHAR(rh.ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(rh.ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as RebatesViewID:String,
        rh.ID,
        rh.ValidFrom,
        rh.ValidTo,
        rh.Year,
        rh.Level,
        rh.Unit,
        rh.Discount,
        rh.RebateLevels,
        rh.ContractID,
        rh.Contract.ValidFrom as ContractValidFrom: Timestamp,
        rh.Contract.ValidTo as ContractValidTo: Timestamp,
        rh.ContractID || '-' || replace(TO_NVARCHAR(Contract.ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
        @Core.Computed: false
        false as isCurrent: Boolean,
        rh.createdAt,
        rh.createdBy,
        rh.modifiedAt,
        rh.modifiedBy  
    } where Contract.Status.StatusText = 'Approved';



    entity MostRecentContractCustomersIDs as select from ContractCustomersHistory
    {
        key ID,
        max(ValidTo) as MaxValidTo:Date
    }group by ID;


    entity ContractCustomersView as select from ContractCustomers as contractcust
        inner join Contracts as contracts on contracts.ID = contractcust.ContractID
        left outer join VistexData as vistex on vistex.VistexID = contracts.VistexID
    {
        key contractcust.ID || '-' || replace(TO_NVARCHAR(contractcust.ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractCustomerViewID:String,
        contractcust.ID,
        contractcust.ValidFrom,
        contractcust.ValidTo,
        case
            when contracts.ContractType.Type = 'New Proposal' 
                then contractcust.BHOID
            when contractcust.IsParent = true 
                then ifnull(vistex.ParentBHOID, contractcust.BHOID)
                else ifnull(vistex.MemberBHOID, contractcust.BHOID)
        end as BHOID:String,
        contractcust.Name,
        contractcust.ContractID,
        contractcust.IsParent,
        contracts.ValidFrom as ContractValidFrom: Timestamp,
        contracts.ValidTo as ContractValidTo: Timestamp,
        contractcust.ContractID || '-' || replace(TO_NVARCHAR(contracts.ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(contracts.ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
        @Core.Computed: false
        true as isCurrent: Boolean,
        contractcust.createdAt,
        contractcust.createdBy,
        contractcust.modifiedAt,
        contractcust.modifiedBy
    }
    union 
    select from MostRecentContractCustomersIDs as mcc
    left outer join ContractCustomersHistory as c on mcc.ID = c.ID and mcc.MaxValidTo = c.ValidTo
    inner join ContractsHistory as ch on ch.ID = c.ContractID
    left outer join VistexData as vistex on vistex.VistexID = ch.VistexID{
        key c.ID || '-' || replace(TO_NVARCHAR(c.ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(c.ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractCustomerViewID:String,
        c.ID,
        c.ValidFrom,
        c.ValidTo,
        case
            when ch.ContractType.Type = 'New Proposal' 
                then c.BHOID
            when c.IsParent = true 
                then ifnull(vistex.ParentBHOID, c.BHOID)
                else ifnull(vistex.MemberBHOID, c.BHOID)
        END as BHOID:String,
        c.Name,
        c.ContractID,
        c.IsParent,
        ch.ValidFrom as ContractValidFrom: Timestamp,
        ch.ValidTo as ContractValidTo: Timestamp,
        c.ContractID || '-' || replace(TO_NVARCHAR(ch.ValidFrom, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') || '-' || replace(TO_NVARCHAR(ch.ValidTo, 'YYYY-MM-DD HH24:MI:SS.FF3') || 'Z', ' ', 'T') as ContractsViewID:String,
        @Core.Computed: false
        true as isCurrent: Boolean,
        c.createdAt,
        c.createdBy,
        c.modifiedAt,
        c.modifiedBy
    } where ch.Status.StatusText = 'Approved';
    entity DiscountProducts as projection on whc.DiscountProducts;
}