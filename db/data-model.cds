namespace com.bayer.SXTENDER.whc;

using {cuid, managed} from '@sap/cds/common';

entity Contracts : cuid, managed {
  // @cds.api.ignore
  @assert.notNull: false
  ValidFrom: Timestamp not null;
  // @cds.api.ignore
  @assert.notNull: false
  ValidTo: Timestamp not null;
  Name              : String;
  BackgroundInfo    : String;
  VistexID          : String; //to validate: string, int or uuid as type
  StatusID          : String;
  TypeID            : String;
  Remarks           : String;
  BaseLineUnits     : Integer;
  BaseLineDiscount  : Double;
  ProposedContractLength : Integer;
  ContractCustomers : Association to many ContractCustomers
                        on ContractCustomers.ContractID = ID;
  Status            : Association to WHCStatus
                        on Status.ID = StatusID;
  ContractType      : Association to WHCTypes
                        on ContractType.ID = TypeID;
  Rebates           : Association to Rebates
                        on Rebates.Contracts = $self;
  Discounts         : Association to Discounts  
                        on Discounts.Contracts = $self;
  Attachments : Composition of many Attachments on Attachments.Contract = $self;
}

entity Contracts_History : managed {
  ID                : UUID;
  ValidFrom         : Timestamp;
  ValidTo           : Timestamp;
  Name              : String;
  BackgroundInfo    : String;
  VistexID          : String; //to validate: string, int or uuid as type
  StatusID          : String;
  TypeID            : String;
  Remarks           : String;
  BaseLineUnits     : Integer;
  BaseLineDiscount  : Double;
  ProposedContractLength : Integer;
  ContractCustomers : Association to many ContractCustomers_History
                        on ContractCustomers.ContractID = ID;
  Status            : Association to WHCStatus
                        on Status.ID = StatusID;
  ContractType      : Association to WHCTypes
                        on ContractType.ID = TypeID;
  Rebates           : Association to Rebates_History
                        on Rebates.Contracts = $self;
  Discounts         : Association to Discounts_History
                        on Discounts.Contracts = $self;
}

entity Attachments:cuid,managed{
  Contract: Association to Contracts;
  Content : LargeBinary @Core.MediaType: MediaType @Core.ContentDisposition.Filename: FileName @Core.ContentDisposition.Type: 'inline';
  MediaType : String  @Core.IsMediaType;
  FileName : String;
}

entity ContractCustomers : cuid, managed {
  // @cds.api.ignore
  @assert.notNull: false
  ValidFrom : Timestamp not null;
  // @cds.api.ignore
  @assert.notNull: false
  ValidTo   : Timestamp not null;
  BHOID     : String;
  Name      : String;
  ContractID: String;
  IsParent  : Boolean default false;
  Contracts : Association to Contracts_History on Contracts.ID = ContractID;
}

entity ContractCustomers_History : managed {
  ID        : UUID;
  ValidFrom : Timestamp;
  ValidTo   : Timestamp;
  BHOID     : String;
  Name      : String;
  ContractID: String;
  IsParent  : Boolean default false;
  Contracts : Association to Contracts on Contracts.ID = ContractID;
}

entity Discounts : cuid, managed {
  Year        : Integer;
  Type        : Integer;
  // @cds.api.ignore
  @assert.notNull: false
  ValidFrom: Timestamp not null;
  // @cds.api.ignore
  @assert.notNull: false
  ValidTo         : Timestamp not null;
  Units           : Integer;
  Discount        : Double;
  ProductID       : String;
  ContractID      : String;
  Contracts       : Association to Contracts on Contracts.ID = ContractID;
  Products        : Composition of many DiscountProducts
                      on Products.Discount = $self;                   
}

entity Discounts_History : managed {
  ID          : UUID;
  Year        : Integer;
  Type        : Integer;
  ValidFrom: Timestamp;
  ValidTo: Timestamp;
  Units           : Integer;
  Discount        : Double;
  ProductID       : String;
  ContractID      : String;
  Contracts       : Association to Contracts_History on Contracts.ID = ContractID;
  Products         : Composition of many DiscountProducts_History
                      on Products.Discount = $self;  
}

entity DiscountProducts: cuid, managed {
  @assert.notNull : false
  ValidFrom       : Timestamp not null;
  @assert.notNull : false
  ValidTo         : Timestamp not null;
  DiscountID      : UUID;
  Product         : Association to WHCProducts;
  Discount        : Association to Discounts on Discount.ID = DiscountID;
}

entity DiscountProducts_History: managed {
  ID              : UUID;
  ValidFrom       : Timestamp;
  ValidTo         : Timestamp; 
  DiscountID      : UUID;
  Product         : Association to WHCProducts;
  Discount        : Association to Discounts_History on Discount.ID = DiscountID;
}

entity Rebates : cuid, managed {
  Year            : Integer;
  Level           : Integer;
  // @cds.api.ignore
  @assert.notNull : false
  ValidFrom: Timestamp not null;
  // @cds.api.ignore
  @assert.notNull : false
  ValidTo         : Timestamp not null;
  Unit            : String(10);
  Discount        : Double;
  RebateLevels    : RebateLevels;
  ContractID      : String;
  Contracts       : Association to Contracts on Contracts.ID = ContractID;
}

entity Rebates_History : managed {
  ID              : UUID;
  Year            : Integer;
  Level           : Integer;
  ValidFrom       : Timestamp;
  ValidTo         : Timestamp;
  Unit            : String(10);
  Discount        : Double;
  RebateLevels    : RebateLevels;
  ContractID      : String;
  Contracts       : Association to Contracts_History on Contracts.ID = ContractID;
}

entity WHCProducts : cuid, managed {
  ProductName     : String(100);
  WAC             : String(100);
}

entity WHCStatus : cuid {
  StatusText          : String(50);
}

entity WHCTypes : cuid, managed {
  Type          : String(50);
}

type RebateLevels {
        Unit_Level_1: Integer;
        Discount_Level_1: Double;
        Unit_Level_2: Integer;
        Discount_Level_2: Double;
        Unit_Level_3: Integer;
        Discount_Level_3: Double;
}