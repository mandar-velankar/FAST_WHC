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
                        on ContractCustomers.Contracts = $self;
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
                        on ContractCustomers.Contracts = $self;
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
  IsParent  : Boolean default false;
  Contracts : Association to Contracts;
}

entity ContractCustomers_History : managed {
  ID        : UUID;
  ValidFrom : Timestamp;
  ValidTo   : Timestamp;
  BHOID     : String;
  Name      : String;
  IsParent  : Boolean default false;
  Contracts : Association to Contracts_History;
}

entity Discounts : cuid, managed {
  key Year        : Integer;
  key Type        : Integer;
  // @cds.api.ignore
  @assert.notNull: false
  ValidFrom: Timestamp not null;
  // @cds.api.ignore
  @assert.notNull: false
  ValidTo         : Timestamp not null;
  Units           : Integer;
  Discount        : Double;
  ProductID       : String;
  Contracts       : Association to Contracts;
  Product         : Association to WHCProducts
                      on Product.ID = ProductID;
}

entity Discounts_History : managed {
  key ID          : UUID;
  key Year        : Integer;
  key Type        : Integer;
  ValidFrom: Timestamp;
  ValidTo: Timestamp;
  Units           : Integer;
  Discount        : Double;
  ProductID       : String;
  Contracts       : Association to Contracts_History;
  Product         : Association to WHCProducts
                      on Product.ID = ProductID;
}

entity Rebates : cuid, managed {
  key Year        : Integer;
  key Level       : Integer;
  // @cds.api.ignore
  @assert.notNull: false
  ValidFrom: Timestamp not null;
  // @cds.api.ignore
  @assert.notNull: false
  ValidTo         : Timestamp not null;
  Unit            : String(10);
  Discount        : Double;
  Contracts       : Association to Contracts;
}

entity Rebates_History : managed {
  key ID          : UUID;
  key Year        : Integer;
  key Level       : Integer;
  ValidFrom       : Timestamp;
  ValidTo         : Timestamp;
  Unit            : String(10);
  Discount        : Double;
  Contracts       : Association to Contracts_History;
}

entity WHCProducts : cuid, managed {
  ProductName     : String(100);
  WAC             : String(100);
}

entity WHCStatus : cuid, managed {
  Status          : String(50);
}

entity WHCTypes : cuid, managed {
  Type          : String(50);
}