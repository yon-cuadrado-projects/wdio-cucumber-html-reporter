import { FEATURE } from './constants';
import { Feature } from './models';
import { SuiteStats } from '@wdio/reporter';

/**
 * Get the feature data object
 * ```html
 * @param {object} featureData
 *
 * @returns {
 *  {
 *      keyword: string,
 *      line: number,
 *      name: string,
 *      tags: string,
 *      uri: string,
 *      elements: Array,
 *      id: string,
 *  }
 * }
 * ```
 */
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
