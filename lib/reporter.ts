import { AFTER, BEFORE, DEFAULT_JSON_FOLDER, DEFAULT_LANGUAGE, PASSED, TEXT_PLAIN, } from './constants';
import { CucumberJsAttachment, Feature, Report } from './models';
import { HookStatsExtended, OptionsExtended } from './types/wdio';
import { Models, generateReport } from 'cucumber-html-report-generator';
import WDIOReporter, { HookStats, RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';
import { addStepData, containsSteps, updateStepStatus } from './steps';
import { existsSync, outputJsonSync, readJsonSync } from 'fs-extra';
import { getCurrentScenario, getScenarioDataObject } from './scenarios';
import { Metadata } from './metadata';
import { getFeatureDataObject } from './features';
import logger from '@wdio/logger';
import { resolve } from 'path';

const log = logger( 'wdio-cucumber-html-reporter' );

export class CucumberHtmlReporter extends WDIOReporter {
    // public language: string;
    public options: Partial<OptionsExtended>;
    public reporterName: string;
    public instanceMetadata: Models.Metadata[];
    public report: Report;
    public metadataClassObject: Metadata;
    public reportProperties: Models.ReportGeneration;

    public constructor( options: Partial<OptionsExtended> ) {
        // const options = <Partial<OptionsExtended>>{};

        options.outputDir = options?.outputDir ?? resolve( process.cwd(), DEFAULT_JSON_FOLDER );
        options.logFile = options.logFile ?? `${options?.outputDir}/logFile.json`;
        super( options );

        if ( !options?.language ) {
            options.language = DEFAULT_LANGUAGE;
            log.info( `The 'language' was not set, it has been set to the default '${DEFAULT_LANGUAGE}'` );
        }

        this.options = options;
        this.instanceMetadata = null;
        this.report = <Report>{};

        this.registerListeners();
        this.metadataClassObject = new Metadata();
    }

    public static attach ( data: string, type = TEXT_PLAIN ): void {
        // eslint-disable-next-line @typescript-eslint/ban-types
        ( process.emit as Function )( 'wdioCucumberHtmlReporter:attachment', { data, type } );
    }

    public static async generateHtmlReport ( reportProperties: Models.ReportGeneration ): Promise<void> {
        // // eslint-disable-next-line @typescript-eslint/ban-types
        // await ( process.emit as Function )( 'wdioCucumberHtmlReporter:reportGeneration', reportProperties );
        await generateReport.generate( reportProperties );
    }

    public registerListeners (): void {
        process.on( 'wdioCucumberHtmlReporter:attachment', this.cucumberJsAttachment.bind( this ) );
        // process.on( 'wdioCucumberHtmlReporter:reportGeneration', this.htmlReportGeneration.bind( this ) );
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

    public onRunnerStart ( runnerData: RunnerStats ): void {
        if ( !this.instanceMetadata ) {
            this.instanceMetadata = this.metadataClassObject.determineMetadata( runnerData );
        }
    }

    public onSuiteStart ( payload: SuiteStats ): void {
        if ( !this.report.feature ) {
            this.report.feature = getFeatureDataObject( payload );
        }

        /* istanbul ignore else */
        if ( !this.report.feature.metadata ) {
            this.report.feature.metadata = this.instanceMetadata;
            // this.report.feature = { ...this.report.feature, metadata: { ...this.instanceMetadata } };
        }

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
        payload.keyword = containsSteps( currentSteps, this.options.language ) ? AFTER : BEFORE;

        addStepData( payload, this.report, this.options.language );
    }

    /**
     * This one is for the end of the hook, it directly comes after the onHookStart
     * A hook is the same  as a 'normal' step, so use the update step
     *
     * @param payload
     */
    public onHookEnd ( payload: HookStats ): void {
        payload.state = payload.error ? payload.state : PASSED;

        return updateStepStatus( payload, this.report, this.options.language );
    }

    /**
     * This one starts the step, which will be set to pending
     *
     * @param {object} payload
     */
    public onTestStart ( payload: TestStats ): void {
        addStepData( payload, this.report, this.options.language );
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
        updateStepStatus( payload, this.report, this.options.language );
    }

    /**
     * The failed step including the logs
     *
     * @param payload
     */
    public onTestFail ( payload: TestStats ): void {
        updateStepStatus( payload, this.report, this.options.language );
    }

    /**
     * The skippe step
     *
     * @param payload
     */
    public onTestSkip ( payload: TestStats ): void {
        updateStepStatus( payload, this.report, this.options.language );
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
    public onRunnerEnd (): void {
        const jsonFolder = resolve( process.cwd(), this.options.outputDir );
        const jsonFile = resolve( jsonFolder, `${this.report.feature.id}.json` );
        const json = [this.report.feature];
        // Check if there is an existing file, if so concat the data, else add the new
        const output = existsSync( jsonFile ) ? json.concat( <Feature>readJsonSync( jsonFile ) ) : json;
        outputJsonSync( jsonFile, output );
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

export default CucumberHtmlReporter;
