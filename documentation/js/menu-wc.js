'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">@nest-queue/source documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' : 'data-bs-target="#xs-controllers-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' :
                                            'id="xs-controllers-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' }>
                                            <li class="link">
                                                <a href="controllers/AppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' : 'data-bs-target="#xs-injectables-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' :
                                        'id="xs-injectables-links-module-AppModule-6e56c1eda88d1f7c81ac5c1cce03447bfc0fbdb66ec07f402412130aed68fac92118bf1dfc018fee1922b312ba7ec19bed8dc8ba38a83f4abc9cf6860d4c6412"' }>
                                        <li class="link">
                                            <a href="injectables/AppService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DataProviderModule.html" data-type="entity-link" >DataProviderModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/PrismaModule.html" data-type="entity-link" >PrismaModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PrismaModule-7ec46d5213648d6af195ca52dfa87b1c4755e5bf4d88e606af4a6f96fffe160393eacdce8d2a5e5c86609ba2e65e54573d9bd60b03145287dbc37bed02a6aff4"' : 'data-bs-target="#xs-injectables-links-module-PrismaModule-7ec46d5213648d6af195ca52dfa87b1c4755e5bf4d88e606af4a6f96fffe160393eacdce8d2a5e5c86609ba2e65e54573d9bd60b03145287dbc37bed02a6aff4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PrismaModule-7ec46d5213648d6af195ca52dfa87b1c4755e5bf4d88e606af4a6f96fffe160393eacdce8d2a5e5c86609ba2e65e54573d9bd60b03145287dbc37bed02a6aff4"' :
                                        'id="xs-injectables-links-module-PrismaModule-7ec46d5213648d6af195ca52dfa87b1c4755e5bf4d88e606af4a6f96fffe160393eacdce8d2a5e5c86609ba2e65e54573d9bd60b03145287dbc37bed02a6aff4"' }>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/RabbitMQModule.html" data-type="entity-link" >RabbitMQModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/WorkerModule.html" data-type="entity-link" >WorkerModule</a>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/ApiClient.html" data-type="entity-link" >ApiClient</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkerTokensModule.html" data-type="entity-link" >WorkerTokensModule</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/ApiProvider.html" data-type="entity-link" >ApiProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BaseWorker.html" data-type="entity-link" >BaseWorker</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BeneficiaryApiProvider.html" data-type="entity-link" >BeneficiaryApiProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BeneficiaryPrismaProvider.html" data-type="entity-link" >BeneficiaryPrismaProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BeneficiaryWorker.html" data-type="entity-link" >BeneficiaryWorker</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BeneficiaryWorker-1.html" data-type="entity-link" >BeneficiaryWorker</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/QueueUtilsService.html" data-type="entity-link" >QueueUtilsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RabbitMQService.html" data-type="entity-link" >RabbitMQService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/BatchItem.html" data-type="entity-link" >BatchItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GlobalDataProviderConfig.html" data-type="entity-link" >GlobalDataProviderConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IDataProvider.html" data-type="entity-link" >IDataProvider</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/QueueDefinition.html" data-type="entity-link" >QueueDefinition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RabbitMQRegisterOptions.html" data-type="entity-link" >RabbitMQRegisterOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkerClassDefinition.html" data-type="entity-link" >WorkerClassDefinition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkerFactoryDefinition.html" data-type="entity-link" >WorkerFactoryDefinition</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});