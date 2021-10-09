import * as fs from 'fs';
import { DEFAULT_LANGUAGE, FAILED, PASSED, PENDING, TEXT_PLAIN } from '../constants';
import { HookStatsExtended, RunnerStatsExtended, SuiteStatsExtended, TestStatsExtended } from '../types/wdio';
import { Report, Scenario } from '../models';
import { copySync, readJsonSync, readdirSync, removeSync } from 'fs-extra';
import CucumberHtmlJsonReporter from '../reporter';
import { FULL_RUNNER_STATS } from './__mocks__/mocks';
import { Metadata } from '../metadata';
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
        tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{}, language );
    } );

    describe( 'on create', () => {
        it( 'should set the defaults only if the reportProperties option is provided', () => {
            const noOptionsReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{ jsonDir: './tmp' } );
            expect( noOptionsReporter.options ).toMatchSnapshot();
        } );

        it( 'should verify initial properties', () => {
            expect( tmpReporter.options ).toMatchSnapshot();
            expect( tmpReporter.instanceMetadata ).toBeNull();
            tmpReporter.onRunnerStart( FULL_RUNNER_STATS );
            expect( tmpReporter.report ).toMatchSnapshot();
            tmpReporter.report = {
                'feature':{
                    'elements': [],
                } } ;

            expect( tmpReporter.report ).toMatchSnapshot();
        } );
    } );

    describe( 'onRunnerStart', () => {
        it( 'should set instance data if it is not available yet', () => {
            const metadata = <Models.Metadata[]>[{ name: 'browser', value: 'chrome 85' }];
            const metadataClassObject: Metadata = tmpReporter.metadataClassObject;
            const determineMetadataSpy: jest.SpyInstance = jest.spyOn( metadataClassObject, 'determineMetadata' ).mockReturnValue( metadata );

            expect( tmpReporter.instanceMetadata ).toBeNull();

            tmpReporter.onRunnerStart( {} as RunnerStatsExtended );

            expect( determineMetadataSpy ).toHaveBeenCalled();
            expect( tmpReporter.instanceMetadata ).toEqual( metadata );
        } );

        it( 'should set not set instance data if it is already available', () => {
            const metadata = <Models.Metadata[]>[{ name: 'browser', value: 'chrome 85' }];
            const determineMetadataSpy: jest.SpyInstance = jest.spyOn( new Metadata(), 'determineMetadata' ).mockReturnValue( metadata );

            tmpReporter.instanceMetadata = metadata;
            expect( tmpReporter.instanceMetadata ).toEqual( metadata );

            tmpReporter.onRunnerStart( {} as RunnerStatsExtended );

            expect( determineMetadataSpy ).not.toHaveBeenCalled();
        } );
    } );

    describe( 'onSuiteStart', () => {
        it( 'should add the CucumberJS feature object if it is not available', () => {
            tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{}, language, logFilePath );
            expect( tmpReporter.report ).toMatchSnapshot();
            tmpReporter.report = <Report>{
                feature: {}
            };

            tmpReporter.onSuiteStart( { keyword: 'feature', title: 'test', uid: '' } as SuiteStatsExtended );

            expect( tmpReporter.report ).toMatchSnapshot();
        } );

        it( 'should add a scenario to the feature if the feature is already there', () => {
            tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{}, language, logFilePath );

            // tmpReporter.report.feature = EMPTY_FEATURE;
            expect( tmpReporter.report.feature?.elements?.length ).toBe( undefined );
            tmpReporter.onSuiteStart( { keyword: 'feature', title: 'test', uid: '' } as SuiteStatsExtended );
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
                            result: {
                                status: PENDING
                            },
                            keyword: 'Given'
                        }]
                    }]
                }
            };
            tmpReporter.onHookStart( { title: '', uid: '', keyword: 'Given' } as HookStatsExtended );
            expect( tmpReporter.report.feature.elements[0].steps[1] ).toMatchSnapshot();
        } );
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
            tmpReporter.onHookEnd( { title: '', uid: '' } as HookStatsExtended );

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

            const argument = {
                'rows': [
                    {
                        'cells': [
                            'Cucumber',
                            'Cucumis sativus'
                        ]
                    },
                    {
                        'cells': [
                            'Burr Gherkin',
                            'Cucumis anguria'
                        ]
                    }
                ]
            };
            tmpReporter.onTestStart( { foo: 'bar', title: '', uid: '', argument, error: new Error( 'error 1' ) } as TestStatsExtended );

            expect( tmpReporter.report.feature.elements[0].steps[0].result.status ).toBe( '' );
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
        it( 'should store the json file on the file system', async () => {
            const outputFolder = path.join( process.cwd(),'./.tmp/output' );
            const reportFolder = path.join( process.cwd(),'./.tmp/report' );
            const jsonFile = `${outputFolder}/this-feature.json`;

            removeSync( outputFolder );
            expect( fileExists( outputFolder ) ).toEqual( false );
            copySync( 'lib/tests/__mocks__/mock.json', jsonFile );
            tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{ jsonDir: outputFolder, reportPath: reportFolder }, 'en' );
            tmpReporter.report.feature = { id: 'this-feature' };

            await tmpReporter.onRunnerEnd();

            const files = readdirSync( outputFolder );

            expect( files.length ).toEqual( 1 );
            expect( files[0].includes( `${tmpReporter.report.feature.id}.json` ) ).toEqual( true );
            expect( fileExists( jsonFile ) ).toEqual( true );

            // Clean up
            removeSync( outputFolder );
            removeSync( reportFolder );
        } );

        it( 'should be able to add json to an existing json output', async () => {
            const outputFolder = path.join( process.cwd(),'./.tmp/output' );
            const jsonFile = `${outputFolder}/mock.json`;
            removeSync( outputFolder );
            copySync( 'lib/tests/__mocks__/mock.json', jsonFile );

            tmpReporter = new CucumberHtmlJsonReporter( <Models.ReportGeneration>{ jsonDir: outputFolder, reportPath: './.tmp' }, 'en' );
            tmpReporter.report.feature = { id: 'this-feature' };

            expect( ( readJsonSync( jsonFile ) as any[] ).length ).toEqual( 1 );

            await tmpReporter.onRunnerEnd();

            const files = readdirSync( outputFolder );

            expect( files.length ).toEqual( 2 );
            expect( ( readJsonSync( jsonFile ) as any[] ).length ).toEqual( 1 );

            // Clean up
            removeSync( outputFolder );
        } );
    } );

    describe( 'attach', () => {
        let mockStdout: jest.SpyInstance;
        beforeAll( () => {
            process.emit = jest.fn();
            mockStdout = jest.spyOn( process, 'emit' ).mockImplementation();
        } );

        afterEach( () => {
        //   process.emit.mockClear();
            mockStdout.mockClear();
        } );

        it( 'should be able to attach default data', () => {
            CucumberHtmlJsonReporter.attach( 'foo' );

            expect( mockStdout ).toHaveBeenCalledTimes( 1 );
            expect( mockStdout ).toHaveBeenCalledWith( 'wdioCucumberHtmlReporter:attachment', {
                data: 'foo',
                type: TEXT_PLAIN
            } );
        } );

        it( 'should be able to attach with all data', () => {
            CucumberHtmlJsonReporter.attach( 'foo', 'type/string' );

            expect( mockStdout ).toHaveBeenCalledTimes( 1 );
            expect( mockStdout ).toHaveBeenCalledWith( 'wdioCucumberHtmlReporter:attachment', {
                data: 'foo',
                type: 'type/string'
            } );
        } );
    } );

    describe( 'cucumberJsAttachment', () => {
        it( 'should be able to add embeddings to a current step when they have not been added', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given',
                            result: {
                                status: PENDING
                            }
                        }]
                    }]
                }
            };

            tmpReporter.cucumberJsAttachment( { data: 'foo', type: 'type/string' } );

            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
        } );

        it( 'should be able to add embeddings to a current step which already has embeddings', () => {
            tmpReporter.report = <Report>{
                feature: {
                    elements: <Scenario[]>[{
                        steps: [{
                            keyword: 'Given',
                            arguments: [{
                                'rows': [
                                    {
                                        'cells': [
                                            'Cucumber',
                                            'Cucumis sativus'
                                        ]
                                    },
                                    {
                                        'cells': [
                                            'Burr Gherkin',
                                            'Cucumis anguria'
                                        ]
                                    }
                                ]
                            }],
                        }]
                    }]
                }
            };

            tmpReporter.cucumberJsAttachment( { data: 'data-2', type: 'mime_type-2' } );
            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
            tmpReporter.cucumberJsAttachment( { data: 'data-2', type: 'mime_type-2' } );

            expect( tmpReporter.report.feature.elements[0].steps[0] ).toMatchSnapshot();
        } );
    } );
} );
