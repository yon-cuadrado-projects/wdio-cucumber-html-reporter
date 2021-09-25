// import * as features from '../features';
import * as fs from 'fs';
// import * as scenarios from '../scenarios';
// import * as steps from '../steps';
// import * as utils from '../utils';
import { DEFAULT_LANGUAGE, FAILED, PASSED, PENDING } from '../constants';
// import {
//     EMPTY_FEATURE, EMPTY_SCENARIO,
//     STEP_HOOK_ONSTART_STATS,
//     TEST_SCENARIO_STATS
// } from './__mocks__/mocks';
import { HookStatsExtended, SuiteStatsExtended, TestStatsExtended } from '../types/wdio';
import { Report, Scenario } from '../models';
import { copySync, readJsonSync, readdirSync, removeSync } from 'fs-extra';
import CucumberHtmlJsonReporter from '../reporter';
import { EMPTY_FEATURE } from './__mocks__/mocks';
import type { Models } from 'cucumber-html-report-generator';
import { fileExists } from './fileExists';
import path from 'path';

describe( 'reporter', () => {
    let tmpReporter: CucumberHtmlJsonReporter = null;
    const logFolder = '.tmp';
    const logFileName = 'logFile.json';
    const logFolderPath = path.join( __dirname, '../../', logFolder );
    const logFilePath = path.join( logFolderPath, logFileName );
    const language = DEFAULT_LANGUAGE;
    beforeAll( () => {
        if ( !fs.existsSync( logFolderPath ) ) {
            fs.mkdirSync( logFolderPath );
            fs.closeSync( fs.openSync( logFilePath, 'w' ) );
        }
    } );

    beforeEach( () => {
        tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{}, 'en' );
    } );

    describe( 'on create', () => {
        // it( 'should verify initial properties', () => {
        //     expect( tmpReporter.options ).toMatchSnapshot();
        //     expect( tmpReporter.instanceMetadata ).toBeNull();
        //     expect( tmpReporter.report ).toMatchSnapshot();
        // } );
        it( 'should set the defaults only if the reportProperties option is provided', () => {
            const noOptionsReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{ jsonDir: './tmp' } );
            expect( noOptionsReporter.options ).toMatchSnapshot();
        } );

        it( 'should verify initial properties', () => {
            expect( tmpReporter.options ).toMatchSnapshot();
            expect( tmpReporter.instanceMetadata ).toBeNull();
            expect( tmpReporter.report ).toMatchSnapshot();
        } );
    } );

    describe( 'onRunnerStart', () => {
        // it( 'should set instance data if it is not available yet', () => {
        //     const metadata = { foo: 'bar' };
        //     const metadataClassObject: Metadata = tmpReporter.metadataClassObject;
        //     const determineMetadataSpy: jest.SpyInstance = jest.spyOn( metadataClassObject, 'determineMetadata' ).mockReturnValue( metadata );

        //     expect( tmpReporter.instanceMetadata ).toBeNull();

        //     tmpReporter.onRunnerStart( {} as RunnerStatsExtended );

        //     expect( determineMetadataSpy ).toHaveBeenCalled();
        //     expect( tmpReporter.instanceMetadata ).toEqual( metadata );
        // } );

        // it( 'should set not set instance data if it is already available', () => {
        //     const metadata = { foo: 'bar' };
        //     const determineMetadataSpy: jest.SpyInstance = jest.spyOn( new Metadata(), 'determineMetadata' ).mockReturnValue( metadata );

        //     tmpReporter.instanceMetadata = metadata;
        //     expect( tmpReporter.instanceMetadata ).toEqual( metadata );

        //     tmpReporter.onRunnerStart( {} as RunnerStatsExtended );

        //     expect( determineMetadataSpy ).not.toHaveBeenCalled();
        // } );
    } );

    describe( 'onSuiteStart', () => {
        it( 'should add the CucumberJS feature object if it is not available', () => {
            tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{}, 'en', language );
            expect( tmpReporter.report ).toMatchSnapshot();

            tmpReporter.onSuiteStart( { keyword: 'feature', title: 'test', uid: '' } as SuiteStatsExtended );

            expect( tmpReporter.report ).toMatchSnapshot();
        } );

        it( 'should add instance data to the feature if the feature is already there', () => {
            const metadata = { foo: 'bar' };
            tmpReporter = new CucumberHtmlJsonReporter( null, 'en', language );

            expect( tmpReporter.report ).toMatchSnapshot();

            tmpReporter.instanceMetadata = metadata;
            tmpReporter.report.feature = EMPTY_FEATURE;

            tmpReporter.report.feature.elements = undefined;
            tmpReporter.onSuiteStart( { title: '', uid: '' } as SuiteStatsExtended );

            expect( tmpReporter.report ).toMatchSnapshot();
        } );

        it( 'should add a scenario to the feature if the feature is already there', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: [] as Scenario[]
                }
            };
            // tmpReporter.report.feature = EMPTY_FEATURE;
            expect( tmpReporter.report.feature.elements.length ).toEqual( 0 );
            tmpReporter.onSuiteStart( { title: '', uid: '' } as SuiteStatsExtended );
            expect( tmpReporter.report.feature.elements ).toMatchSnapshot();
        } );
    } );

    describe( 'onHookStart', () => {
        it( 'should add a pending before step', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                    }]
                }
            };
            tmpReporter.onHookStart( { title: '', uid: '' } as HookStatsExtended );
            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
        } );

        it( 'should add a pending after step', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };
            tmpReporter.onHookStart( { title: '', uid: '', keyword: 'Given' } as HookStatsExtended );
            expect( tmpReporter.report.feature.elements[0].steps[1] ).toMatchSnapshot();
        } );

        // it( 'should call `addStepData` to add a pending before step', () => {
        //     const getCurrentScenarioSpy = jest.spyOn( scenarios, 'getCurrentScenario' ).mockReturnValue( EMPTY_SCENARIO );
        //     const containsStepsSpy = jest.spyOn( utils, 'containsSteps' ).mockReturnValue( false );
        //     const addStepDataSpy = jest.spyOn( steps, 'addStepData' ).mockReturnValue();
        //     tmpReporter.report = <Report>{};
        //     tmpReporter.onHookStart( {} as HookStatsExtended );

        //     expect( getCurrentScenarioSpy ).toHaveBeenCalledTimes( 1 );
        //     expect( containsStepsSpy ).toHaveBeenCalledTimes( 1 );
        //     expect( addStepDataSpy ).toHaveBeenCalledWith( { state: PASSED, keyword: BEFORE } );
        // } );

        // it( 'should call `addStepData` to add a pending after step', () => {
        //     const getCurrentScenarioSpy = jest.spyOn( scenarios, 'getCurrentScenario' ).mockReturnValue( EMPTY_SCENARIO );
        //     const containsStepsSpy = jest.spyOn( utils, 'containsSteps' ).mockReturnValue( true );
        //     const addStepDataSpy = jest.spyOn( steps, 'addStepData' ).mockReturnValue();

        //     tmpReporter.onHookStart( {} as HookStatsExtended );

        //     expect( getCurrentScenarioSpy ).toHaveBeenCalledTimes( 1 );
        //     expect( containsStepsSpy ).toHaveBeenCalledTimes( 1 );
        //     expect( addStepDataSpy ).toHaveBeenCalledWith( { state: PASSED, keyword: AFTER } );
        // } );
    } );

    describe( 'onHookEnd', () => {
        it( 'should update the last step of the current scenario with its result', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };
            tmpReporter.onHookEnd( { state: PASSED, title: '', uid: '' } as HookStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( PASSED );
        } );

        it( 'should call update a hook step to the current state when there is an error', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };

            tmpReporter.onHookEnd( { state: FAILED, title: '', uid: '', error: new Error( 'error 1' ) } as HookStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( FAILED );
        } );
    } );

    describe( 'onTestStart', () => {
        it( 'should add the step data when a test is started', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: []
                    }]
                }
            };

            tmpReporter.onTestStart( { foo: 'bar', state: FAILED, title: '', uid: '', error: new Error( 'error 1' ) } as TestStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( FAILED );
        } );
    } );

    describe( 'onTestPass', () => {
        it( 'should update the last step with the provided data', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            result: {
                                status: PASSED
                            }
                        }]
                    }]
                }
            };
            tmpReporter.onTestPass( { state: PASSED, title: '', uid: '' } as TestStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( PASSED );
        } );
    } );

    describe( 'onTestFail', () => {
        it( 'should update the last step with the provided data', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };

            tmpReporter.onTestFail( { state: FAILED, title: '', uid: '', error: new Error( 'error 1' ) } as TestStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( FAILED );
        } );
    } );

    describe( 'onTestSkip', () => {
        it( 'should call update a step', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };

            tmpReporter.onTestSkip( { state: PENDING, title: '', uid: '' } as TestStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( PENDING );
        } );
    } );

    describe( 'onRunnerEnd', () => {
        it( 'should store the json file on the file system', () => {
            const jsonFolder = './.tmp/ut-folder';

            tmpReporter.report.feature = { id: 'this-feature' };
            tmpReporter.options.jsonFolder = jsonFolder;

            expect( fileExists( jsonFolder ) ).toEqual( false );

            tmpReporter.onRunnerEnd();

            const files = readdirSync( jsonFolder );

            expect( files.length ).toEqual( 1 );
            expect( files[0].includes( tmpReporter.report.feature.id ) ).toEqual( true );
            expect( fileExists( jsonFolder ) ).toEqual( true );

            // Clean up
            removeSync( jsonFolder );
        } );

        it( 'should be able to add json to an existing json output', () => {
            const jsonFolder = './.tmp/ut-folder';
            const jsonFile = `${jsonFolder}/this-feature.json`;

            copySync( 'lib/tests/__mocks__/mock.json', jsonFile );

            tmpReporter.report.feature = { id: 'this-feature' };
            tmpReporter.options.jsonFolder = jsonFolder;

            expect( ( readJsonSync( jsonFile ) as any[] ).length ).toEqual( 1 );

            tmpReporter.onRunnerEnd();

            const files = readdirSync( jsonFolder );

            expect( files.length ).toEqual( 1 );
            expect( ( readJsonSync( jsonFile ) as any[] ).length ).toEqual( 2 );

            // Clean up
            removeSync( jsonFolder );
        } );
    } );

    // describe( 'getFeatureDataObject', () => {
    //     it( 'should be able to to create a feature JSON data object', () => {

    //         expect( features.getFeatureDataObject( SUITE_FEATURE_STATS ) ).toMatchSnapshot();
    //     } );

    //     it( 'should be able to to create a feature JSON data object with no line data', () => {

    //         expect( features.getFeatureDataObject( SUITE_FEATURE_UID ) ).toMatchSnapshot();
    //     } );
    // } );

    // describe( 'getScenarioDataObject', () => {
    // it( 'should be able to to create a scenario JSON data object', () => {

    //     expect( scenarios.getScenarioDataObject(
    //         TEST_SCENARIO_STATS,
    //         'create-passed-feature',
    //     ) ).toMatchSnapshot();
    // } );
    // } );

    describe( 'getStepDataObject', () => {
        // let getFailedMessageSpy;

        // beforeEach( () => {
        // getFailedMessageSpy = jest.spyOn( utils, 'getFailedMessage' ).mockReturnValue( {} );
        // } );

        // it( 'should be able to to create a step JSON data object', () => {
        //     expect( steps.getStepDataObject( STEP_TEST_ONSTART_STATS, language ) ).toMatchSnapshot();
        //     expect( getFailedMessageSpy ).toHaveBeenCalledTimes( 1 );
        // } );

        // it( 'should be able to add arguments to the step if they are present', () => {
        //     expect( steps.getStepDataObject( STEP_TEST_ONSTART_ARGUMENT_STATS, language ) ).toMatchSnapshot();
        //     expect( getFailedMessageSpy ).toHaveBeenCalledTimes( 1 );
        // } );

        // it( 'should be able to to create a step JSON data object based on a hook', () => {
        //     STEP_HOOK_ONSTART_STATS.keyword = BEFORE;
        //     expect( steps.getStepDataObject( STEP_HOOK_ONSTART_STATS, language ) ).toMatchSnapshot();
        //     expect( getFailedMessageSpy ).toHaveBeenCalledTimes( 1 );
        // } );

        // it( 'should be able to to create a step JSON data object based on malformed data', () => {
        //     expect( steps.getStepDataObject( TEST_EMPTY_STATS, language ) ).toMatchSnapshot();
        //     expect( getFailedMessageSpy ).toHaveBeenCalled();
        // } );

        // it( 'should be able to to create a step JSON data object based on missing keyword data', () => {
        //     expect( steps.getStepDataObject( TEST_NO_KEYWORD_STATS, language ) ).toMatchSnapshot();
        //     expect( getFailedMessageSpy ).toHaveBeenCalled();
        // } );
    } );

    // describe( 'getCurrentScenario', () => {
    //     it( 'should return the last number of the scenario array as the current running scenario number', () => {
    //         tmpReporter.report.feature = {
    //             elements: [{ foo: 'first-scenario' }, { bar: 'second-scenario' }, { foobar: 'current-scenario' }],
    //         };

    //         const report = <Report>{};
    //         expect( scenarios.getCurrentScenario( report ) ).toEqual( { foobar: 'current-scenario' } );
    //     } );
    // } );

    // describe( 'getCurrentStep', () => {
    //     it( 'should return current running step', () => {
    //         const currentScenarioMock = {
    //             steps: [
    //                 { foo: 'first-step' },
    //                 { foo: 'second-step' },
    //                 { foo: 'current-step' },
    //             ] as Step[],
    //         };
    //         const getCurrentScenarioSpy = jest.spyOn( scenarios, 'getCurrentScenario' ).mockReturnValue( currentScenarioMock );
    //         const currentScenario = {};
    //         expect( steps.getCurrentStep( currentScenario ) ).toEqual( currentScenarioMock.steps[2] );
    //         expect( getCurrentScenarioSpy ).toHaveBeenCalledTimes( 1 );
    //     } );
    // } );

    // describe( 'addStepData', () => {
    //     it( 'should add step data to a current scenario', () => {
    //         const getCurrentScenarioSpy = jest.spyOn( scenarios, 'getCurrentScenario' );
    //         const getStepDataObjectSpy = jest.spyOn( steps, 'getStepDataObject' ).mockReturnValue( { foo: 'current-step' } );

    //         tmpReporter.report.feature = EMPTY_FEATURE;
    //         tmpReporter.report.feature.elements.push( EMPTY_SCENARIO );

    //         expect( tmpReporter.report.feature.elements[0].steps.length ).toEqual( 0 );

    //         steps.addStepData( {} as HookStatsExtended, tmpReporter.report, language );

    //         expect( tmpReporter.report.feature.elements[0].steps.length ).toEqual( 1 );

    //         expect( tmpReporter.report.feature.elements[0].steps ).toMatchSnapshot();
    //         expect( getCurrentScenarioSpy ).toHaveBeenCalledTimes( 1 );
    //         expect( getStepDataObjectSpy ).toHaveBeenCalledTimes( 1 );
    //     } );
    // } );

    // describe( 'updateStepStatus', () => {
    //     it( 'should update step data of the current scenario step', () => {
    //         const pendingStep = { foo: 'current-step', status: PENDING };
    //         // const updatedStep = { foo: 'current-step', status: PASSED, bar: false };
    //         // const getCurrentScenarioSpy = jest.spyOn( scenarios, 'getCurrentScenario' );
    //         // const getStepDataObjectSpy = jest.spyOn( steps, 'getStepDataObject' ).mockReturnValue( updatedStep );
    //         // const getCurrentStepSpy = jest.spyOn( steps, 'getCurrentStep' ).mockReturnValue( { foo: 'current-step' } );

    //         tmpReporter.report.feature = EMPTY_FEATURE;
    //         tmpReporter.report.feature.elements.push( EMPTY_SCENARIO );
    //         tmpReporter.report.feature.elements[0].steps.push( pendingStep );

    //         expect( tmpReporter.report.feature.elements[0].steps ).toMatchSnapshot();
    //         expect( tmpReporter.report.feature.elements[0].steps.length ).toEqual( 1 );
    //         // const report = <Report>{};

    //         steps.updateStepStatus( {} as TestStatsExtended, tmpReporter.report, language );

    //         expect( tmpReporter.report.feature.elements[0].steps ).toMatchSnapshot();
    //         expect( tmpReporter.report.feature.elements[0].steps.length ).toEqual( 1 );
    //         // expect( getCurrentScenarioSpy ).toHaveBeenCalledTimes( 1 );
    //         // expect( getStepDataObjectSpy ).toHaveBeenCalledTimes( 1 );
    //         // expect( getCurrentStepSpy ).toHaveBeenCalledTimes( 1 );
    //     } );
    // } );

    // describe( 'attach', () => {
    // let mockStdout: jest.SpyInstance;
    // beforeAll( () => {
    //   process.emit = jest.fn();
    // mockStdout = jest.spyOn( process, 'emit' ).mockImplementation();


    // } );

    // afterEach( () => {
    //     //   process.emit.mockClear();
    //     mockStdout.mockClear();
    // } );

    // it( 'should be able to attach default data', () => {
    //     CucumberHtmlJsonReporter.attach( 'foo' );

    // expect( mockStdout ).toHaveBeenCalledTimes( 1 );
    // expect( mockStdout ).toHaveBeenCalledWith( 'wdioCucumberJsReporter:attachment', {
    //     data: 'foo',
    //     type: TEXT_PLAIN
    // } );
    // } );

    // it( 'should be able to attach with all data', () => {
    //     CucumberHtmlJsonReporter.attach( 'foo', 'type/string' );

    // expect( mockStdout ).toHaveBeenCalledTimes( 1 );
    // expect( mockStdout ).toHaveBeenCalledWith( 'wdioCucumberJsReporter:attachment', {
    //     data: 'foo',
    //     type: 'type/string'
    // } );
    // } );
    // } );

    describe( 'cucumberJsAttachment', () => {
        it( 'should be able to add embeddings to a current step when they have not been added', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given',
                            result:{
                                status: PENDING
                            }
                        }]
                    }]
                }
            };
            // const pendingStep = { foo: 'current-step', status: PENDING };
            // const getCurrentStepSpy = jest.spyOn( steps, 'getCurrentStep' ).mockReturnValue( pendingStep );

            // tmpReporter.report.feature = EMPTY_FEATURE;
            // tmpReporter.report.feature.elements.push( EMPTY_SCENARIO );
            // tmpReporter.report.feature.elements[0].steps.push( pendingStep );

            // expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
            // const currentScenario = {};
            tmpReporter.cucumberJsAttachment( { data: 'foo', type: 'type/string' } );
            // steps.cucumberJsAttachment( null, currentScenario );

            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
            // expect( getCurrentStepSpy ).toHaveBeenCalledTimes( 1 );
        } );

        it( 'should be able to add embeddings to a current step which already has embeddings', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given'
                        }]
                    }]
                }
            };

            // tmpReporter.report.feature = EMPTY_FEATURE;
            // tmpReporter.report.feature.elements.push( EMPTY_SCENARIO );
            // tmpReporter.report.feature.elements[0].steps.push( pendingStep );
            tmpReporter.cucumberJsAttachment( { data: 'data-2', type: 'mime_type-2' } );
            // CucumberHtmlJsonReporter.attach( 'data-2', 'mime_type-2' );
            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
            tmpReporter.cucumberJsAttachment( { data: 'data-2', type: 'mime_type-2' } );
            // CucumberHtmlJsonReporter.attach( 'data-2', 'mime_type-2' );

            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
            // expect( getCurrentStepSpy ).toHaveBeenCalledTimes( 1 );
        } );
    } );
} );
