import { HookStats, TestStats } from '@wdio/reporter';
import { HookStatsExtended, TestStatsExtended } from './types/wdio';
import { Report, Scenario, Step } from './models';
import { dialects } from '@cucumber/gherkin';
import { getCurrentScenario } from './scenarios';
import { getFailedMessage } from './utils';



/**
 * Get the current step
 *
 * @return {object}
 */
export const getCurrentStep = ( currentScenario: Scenario ): Step => currentScenario?.steps[currentScenario?.steps?.length - 1];

/**
 * Add step data to the current running scenario
 *
 * @param {object} test
 */
export const updateStepStatus = ( test: TestStats | HookStats, report: Report, language: string ): void => {
    // There is always a scenario, take the last one
    const currentScenario = getCurrentScenario( report );
    const currentSteps = currentScenario?.steps;
    const currentStepsLength = currentSteps?.length;
    const stepData = getStepDataObject( test, language );

    currentSteps[currentStepsLength - 1] = { ...getCurrentStep( getCurrentScenario( report ) ), ...stepData };
    currentScenario.steps = currentSteps;
};

/**
 * Get the step data object
 * ```
 * @param {object} stepData This is the testdata of the step
 *
 * @returns {
 *  {
 *      arguments: Array,
 *      keyword: string,
 *      name: *,
 *      result: {
 *          status: string,
 *          duration: number
 *      },
 *      line: number,
 *      match: {
 *          location: string,
 *      },
 *  }
 * }
 * ```
 */
export const getStepDataObject = ( stepData: TestStatsExtended | HookStatsExtended, language: string ): Step => {
    const keyword = stepData.keyword
        || keywordStartsWith( stepData.title, language )
        || '';
    const title = ( stepData.title.split( keyword ).pop() || stepData.title || '' ).trim();
    const stepResult = {
        arguments: stepData.argument ? [stepData.argument] : [],
        keyword,
        name: title,
        result: {
            status: stepData.state || '',
            duration: ( stepData._duration || 0 ) * 1000000,
            ...getFailedMessage( stepData )
        },
        line: parseInt( stepData.uid.substring( title.length, stepData.uid.length ), 10 ) || '',
        match: {
            location: 'can not be determined with webdriver.io'
        }
    };

    return stepResult;
};

/**
 * Add step data to the current running scenario
 *
 * @param {object} test
 */
export const addStepData = ( test: TestStats | HookStats, report: Report, language: string ): void => {
    // Always add the finished step to the end of the steps
    // of the last current scenario that is running
    getCurrentScenario( report ).steps = getCurrentScenario( report ).steps ?? [];
    getCurrentScenario( report ).steps.push( getStepDataObject( test, language ) );
};

/**
 * Check if the steps contain valid steps
 *
 * @param {array} steps
 *
 * @param {string} language
 *
 * @return {boolean}
 */
export const containsSteps = ( steps: Step[], language: string ): boolean => {
    const stepKeywords = getStepKeywords( language );
    return steps?.some( step => stepKeywords.includes( step.keyword ) );
};

/**
 * Returns the first word in case it's a keyword in the specified language
 *
 * @param {array} title
 *
 * @param {string} language
 *
 * @return {string|undefined}
 */
export const keywordStartsWith = ( title: string, language: string ): string | undefined => {
    const stepKeywords = [].concat( getStepKeywords( language ), ['After', 'Before'] );
    const regex = new RegExp( `^(${stepKeywords.join( '|' )})\\s` );
    return ( regex.exec( title ) || [] ).pop() as string;
};

/**
 * Return the list of step keywords in the specified language
 *
 * @param language {string}
 *
 * @return {string[]}
 */
export const getStepKeywords = ( language: string ): string[] => {
    const dialect = dialects[language];
    return ( [] as string[] )
        .concat( dialect.given, dialect.when, dialect.then, dialect.and )
        .map( keyword => keyword.replace( /\s*$/, '' ) )
        .filter( keyword => keyword !== '*' );
};
