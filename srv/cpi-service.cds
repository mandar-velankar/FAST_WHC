namespace com.bayer.SXTENDER.CpiService;

using com.bayer.SXTENDER.whc as whc from '../db/data-model';


service CpiService @(path: 'cpi') @(requires:['f_tndr_cag_admin','f_tndr_cag_cpi_user']){

    entity VistexData as projection on whc.VistexData;
    

}