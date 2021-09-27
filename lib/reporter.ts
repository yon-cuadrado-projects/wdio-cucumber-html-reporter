import {
    AFTER,
    BEFORE,
    DEFAULT_JSON_FOLDER,
    DEFAULT_LANGUAGE,
    PASSED,
    TEXT_PLAIN,
} from './constants';
import { CucumberJsAttachment, MetadataObject, Report } from './models';
import { Models, generateReport } from 'cucumber-html-report-generator';
import WDIOReporter, { HookStats, RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';
import { addStepData, containsSteps, updateStepStatus } from './steps';
import { dirname, resolve } from 'path';
import { existsSync, outputJsonSync, readJsonSync } from 'fs-extra';
import { getCurrentScenario, getScenarioDataObject } from './scenarios';
import { HookStatsExtended } from './types/wdio';
import { Metadata } from './metadata';
import { Reporters } from '@wdio/types';
import { getFeatureDataObject } from './features';
import logger from '@wdio/logger';

const log = logger( 'wdio-cucumber-html-reporter' );

export class CucumberHtmlJsonReporter extends WDIOReporter {
    public language: string;
    public options: Partial<Reporters.Options>;
    public reporterName: string;
    public instanceMetadata: MetadataObject;
    public report: Report;
    public metadataClassObject: Metadata;
    public reportProperties: Models.ReportGeneration;

    public constructor( reportProperties: Models.ReportGeneration, language?: string, logFile?: string ) {
        const options = <Partial<Reporters.Options>>{};
        options.outputDir = reportProperties?.reportPath;
        options.logFile = logFile ?? `${process.cwd()}/.tmp/logFile.json`;
        options.jsonFolder = reportProperties?.jsonDir ?? DEFAULT_JSON_FOLDER;

        // if ( !options.jsonFolder ) {
        //     options.jsonFolder = DEFAULT_JSON_FOLDER;
        //     log.info( `The 'jsonFolder' was not set, it has been set to the default '${DEFAULT_JSON_FOLDER}'` );
        // }
        super( options );
        if ( !language ) {
            this.language = DEFAULT_LANGUAGE;
            log.info( `The 'language' was not set, it has been set to the default '${DEFAULT_LANGUAGE}'` );
        } else {
            this.language = language;
        }

        this.reportProperties = reportProperties ?? <Models.ReportGeneration>{};
        this.reportProperties.jsonDir = reportProperties?.jsonDir ?? `./${DEFAULT_JSON_FOLDER}`;
        this.options = options;
        this.instanceMetadata = null;
        this.report = <Report>{};

        this.registerListeners();
        this.metadataClassObject = new Metadata();
    }

    /**
     * Attach data to the report
     *
     * @param {string|object} data
     * @param {string} type Default is `text/plain`, otherwise what people deliver as a MIME type, like `application/json`, `image/png`
     */
    public static attach ( data: string, type = TEXT_PLAIN ): void {

        // eslint-disable-next-line @typescript-eslint/ban-types
        ( process.emit as Function )( 'wdioCucumberHtmlReporter:attachment', { data, type } );
    }

    /**
     * Add a customer listener for the attachments
     */
    public registerListeners (): void {
        process.on( 'wdioCucumberHtmlReporter:attachment', this.cucumberJsAttachment.bind( this ) );
    }



    /**
     * The order of running of the `on*` is the following:
     * - onRunnerStart
     * - onSuiteStart (feature)
     * - onSuiteStart (scenario)
     * - onHookStart
     * - onHookEnd
     * - onTestStart
     * - onBeforeCommand
     * - onAfterCommand
     * - onTestPass
     * - onHookStart
     * - onHookEnd
     * - onSuiteEnd (scenario is done)
     * - onSuiteEnd (feature is done)
     * - onRunnerEnd
     */

    /**
     * This hook is used to retrieve the browser data, but this is done only once
     *
     * @param {object} runnerData
     */
    public onRunnerStart ( runnerData: RunnerStats ): void {
        if ( !this.instanceMetadata ) {
            this.instanceMetadata = this.metadataClassObject.determineMetadata( runnerData );
        }
    }

    /**
     * This hook is called twice:
     * 1. create the feature
     * 2. add the scenario to the feature
     *
     * @param {object} payload
     */
    public onSuiteStart ( payload: SuiteStats ): void {
        if ( !this.report.feature ) {
            this.report.feature = getFeatureDataObject( payload );
        }

        // /* istanbul ignore else */
        // if ( !this.report.feature.metadata ) {
        //     this.report.feature = { ...this.report.feature, metadata: { ...this.instanceMetadata } };
        // }

        if ( typeof this.report.feature.elements !== 'undefined' ) {
            this.report.feature.elements.push( getScenarioDataObject( payload, this.report.feature.id ) );
        }
    }

    /**
     * This one is for the start of the hook and determines if this is a pending `before` or `after` hook.
     * The data will be equal to a step, so a hook is added as a step.
     *
     * @param payload
     */
    public onHookStart ( payload: HookStatsExtended ): void {
        // There is always a scenario, take the last one
        const currentSteps = getCurrentScenario( this.report ).steps;
        payload.state = PASSED;
        payload.keyword = containsSteps( currentSteps, this.language ) ? AFTER : BEFORE;

        addStepData( payload, this.report, this.language );
    }

    /**
     * This one is for the end of the hook, it directly comes after the onHookStart
     * A hook is the same  as a 'normal' step, so use the update step
     *
     * @param payload
     */
    public onHookEnd ( payload: HookStats ): void {
        payload.state = payload.error ? payload.state : PASSED;

        return updateStepStatus( payload, this.report, this.language );
    }

    /**
     * This one starts the step, which will be set to pending
     *
     * @param {object} payload
     */
    public onTestStart ( payload: TestStats ): void {
        addStepData( payload, this.report, this.language );
    }

    // /**
    //  * This one starts a command
    //  *
    //  * @param payload
    //  */
    // onBeforeCommand(payload) {
    //     // console.log('\nconst onBeforeCommand= ', JSON.stringify(payload), '\n')
    // }

    // /**
    //  * This is the result of the command
    //  *
    //  * @param payload
    //  */
    // onAfterCommand(payload) {
    //     // console.log('\nconst onAfterCommand= ', JSON.stringify(payload), '\n')
    // }

    // onScreenshot(payload) {
    //     // console.log('\nconst onScreenshot= ', JSON.stringify(payload), '\n')
    // }

    /**
     * The passed step
     *
     * @param payload
     */
    public onTestPass ( payload: TestStats ): void {
        updateStepStatus( payload, this.report, this.language );
    }

    /**
     * The failed step including the logs
     *
     * @param payload
     */
    public onTestFail ( payload: TestStats ): void {
        updateStepStatus( payload, this.report, this.language );
    }

    /**
     * The skippe step
     *
     * @param payload
     */
    public onTestSkip ( payload: TestStats ): void {
        updateStepStatus( payload, this.report, this.language );
    }

    // onTestEnd(payload) {
    //     console.log('\nonTestEnd');
    // }

    // /**
    //  * Executed twice:
    //  * - at the end of a scenario
    //  * - at the end of all scenario's
    //  *
    //  * @param payload
    //  */
    // onSuiteEnd(payload) {}

    /**
     * Runner is done, write the file
     */
    public async onRunnerEnd (): Promise<void> {
        const jsonFolder = resolve( process.cwd(), this.options.jsonFolder );
        const jsonFile = resolve( jsonFolder, `${this.report.feature.id}.json` );
        const json = [this.report.feature];
        // Check if there is an existing file, if so concat the data, else add the new
        const output = existsSync( jsonFile ) ? json.concat( readJsonSync( jsonFile ) ) : json;
        outputJsonSync( jsonFile, output );
        this.reportProperties.jsonDir = dirname( jsonFile );
        await generateReport.generate( this.reportProperties );
    }

    /**
     * Add the attachment to the result
     *
     * @param {string|object} data
     * @param {string} type
     */
    public cucumberJsAttachment( attachment: CucumberJsAttachment ): void {
        // The attachment can be added to the current running scenario step
        const currentScenario = getCurrentScenario( this.report );
        const currentStep = currentScenario.steps[currentScenario.steps.length - 1];
        const embeddings = {
            data: attachment.data,
            mime_type: attachment.type,
        };

        // Check if there is an embedding, if not, add it, else push it
        if ( ! currentStep.embeddings ) {
            currentStep.embeddings = [embeddings];
        } else {
            currentStep.embeddings.push( embeddings );
        }
    }
}

// CucumberJsJsonReporter.name = 'cucumberjs-json';
export default CucumberHtmlJsonReporter;
