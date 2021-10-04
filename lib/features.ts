import { FEATURE } from './constants';
import { Feature } from './models';
import { SuiteStats } from '@wdio/reporter';

export const getFeatureDataObject = ( featureData: SuiteStats ): Feature => {
    const featureName = featureData.title;

    return {
        keyword: FEATURE,
        type: featureData.type,
        description: ( featureData.description || '' ),
        line: parseInt( featureData.uid.substring( featureName.length, featureData.uid.length ), 10 ),
        name: featureName,
        uri: 'Can not be determined',
        tags: featureData.tags || [],
        elements: [],
        id: featureName.replace( /[\\/?%*:|"<> ]/g, '-' ).toLowerCase(),
    };
};
