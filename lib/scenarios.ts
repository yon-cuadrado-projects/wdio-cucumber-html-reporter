import { HookStatsExtended, SuiteStatsExtended, TestStatsExtended } from './types/wdio';
import { Report, Scenario } from './models';
import { SCENARIO } from './constants';

/**
 * Get the current scenario
 *
 * @return {object}
 */
export const getCurrentScenario = ( report: Report ): Scenario => report?.feature?.elements ?
    report?.feature?.elements[report?.feature?.elements?.length - 1] :
     <Scenario>{};


/**
 * Get the scenario data object
 *
 * @param {object} scenarioData This is the testdata of the current scenario
 * @param {string} id scenario id
 *
 * @returns {
 *  {
 *      keyword: string,
 *      description: string,
 *      name: string,
 *      tags: string,
 *      id: string,
 *      steps: Array,
 *  }
 * }
 */
export const getScenarioDataObject = ( scenarioData: TestStatsExtended | SuiteStatsExtended | HookStatsExtended, id: string ): Scenario => {
    const scenarioName = scenarioData.title;

    return {
        keyword: SCENARIO,
        type: scenarioData.type,
        description: ( scenarioData.description || '' ),
        name: scenarioName,
        tags: scenarioData.tags || [],
        id: `${id};${scenarioData.title.replace( / /g, '-' ).toLowerCase()}`,
        steps: [],
    };
};
