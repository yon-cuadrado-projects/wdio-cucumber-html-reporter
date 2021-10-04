import { SMALL_RUNNER_STATS, SMALL_RUNNER_STATS_PLATFORM_MAC, SMALL_RUNNER_STATS_PLATFORM_OSX, SMALL_RUNNER_STATS_PLATFORM_WINDOWS, SMALL_RUNNER_STATS_WITH_CJSON } from './__mocks__/mocks';
import { Browser } from 'webdriverio';
import { Metadata } from '../metadata';
import { WebdriverIOExtended } from '../types/wdio';

describe( 'metadata', () => {
    let metadataClassObject: Metadata;
    beforeAll( () => {
        metadataClassObject = new Metadata();
    } );

    describe( 'determineMetadata', () => {
        beforeEach( () => {
            delete global.browser;
            global.browser = {
                options: {
                    requestedCapabilities: {
                        'cjson:metadata': {
                            app: {
                                name: 'mock-appName',
                                version: 'mock-appVersion',
                            },
                        },
                        w3cCaps: {
                            alwaysMatch: {
                                foo: true,
                            }
                        }
                    },
                } as WebdriverIOExtended,
            } as Browser<'async'>;

        } );

        afterEach( () => {
            delete global.browser;
        } );

        it( 'should return no metadata when there is none', () => {
            global.browser = {
                options: {
                } as WebdriverIOExtended,
            } as Browser<'async'>;
            expect( metadataClassObject.determineMetadata( SMALL_RUNNER_STATS_WITH_CJSON ) ).toMatchSnapshot();
        } );

        it( 'should return app metadata with cjson:metadata', () => {
            const result = metadataClassObject.determineMetadata( SMALL_RUNNER_STATS );
            expect( result ).toMatchSnapshot();
        } );

        it( 'should return metadata with platform mac', () => {
            const result = metadataClassObject.determineMetadata( SMALL_RUNNER_STATS_PLATFORM_MAC );
            expect( result ).toMatchSnapshot();
        } );

        it( 'should return metadata with platform osx', () => {
            const result = metadataClassObject.determineMetadata( SMALL_RUNNER_STATS_PLATFORM_OSX );
            expect( result ).toMatchSnapshot();
        } );

        it( 'should return metadata with platfrom windows', () => {
            const result = metadataClassObject.determineMetadata( SMALL_RUNNER_STATS_PLATFORM_WINDOWS );
            expect( result ).toMatchSnapshot();
        } );
    } );
} );
