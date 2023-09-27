namespace com.bayer.SXTENDER.CpiService;

using com.bayer.SXTENDER.whc as whc from '../db/data-model';


service CpiService @(path: 'cpi') {

    entity VistexData as projection on whc.VistexData;
    

}