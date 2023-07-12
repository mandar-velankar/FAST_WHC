namespace com.bayer.SXTENDER.whc;

using {cuid} from '@sap/cds/common';

entity Contracts : cuid {
  Name              : String;
  Background        : String;
  Status            : String;
  VistexID          : String; //to validate: string, int or uuid as type
  ContractCustomers : Association to many ContractCustomers
                        on ContractCustomers.Contracts = $self;
}

entity ContractCustomers : cuid {
  BHOID     : String;
  Name      : String;
  Contracts : Association to Contracts;
}
