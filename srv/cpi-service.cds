using com.bayer.SXTENDER.whc as whc from '../db/data-model';


service CpiService @(path: 'cpiwhc') {

    entity VistexData as projection on whc.VistexData;
    

}