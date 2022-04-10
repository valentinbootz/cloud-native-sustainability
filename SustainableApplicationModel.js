import BpmnModdle from 'bpmn-moddle';
import SustainabilityExtension from './cloud-native-sustainability.json';

class SustainableApplicationModel {

    #moddle = new BpmnModdle({
        sustainability: SustainabilityExtension
    });

    constructor(xml) {
        this.xml = xml;
    }

    async #services() {
        const {
            elementsById: elements
        } = await this.#moddle.fromXML(this.xml);

        const services = Object.entries(elements).reduce((services, [id, element]) => {
            if (element.$type == 'bpmn:ServiceTask') {
                services[id] = element;
            }
            return services;
        }, {});

        return services;
    }

    #handlers(service) {

        let handlers = (({
            standard,
            highPerformance,
            lowPower
        }) => ({
            standard,
            highPerformance,
            lowPower
        }))(service.extensionElements.values.find(value => value.$type == "bpmncns:ExecutionModalities"));

        Object.entries(handlers).forEach(([key, value]) => {
            if (typeof value === 'undefined') delete handlers[key]
            else handlers[key] = (({ id, name, description }) => ({ id, name, description }))(value)
        })

        return handlers;
    }

    async update(services) {

        const {
            rootElement: root,
        } = await this.#moddle.fromXML(this.xml);

        root.rootElements.map(element => {
            element.flowElements.map(element => {
                if (element.$type == 'bpmn:ServiceTask') {
                    let {
                        optional,
                        handlers
                    } = {
                        ...services.find(service => {
                            let {
                                id
                            } = service;
                            return id == element.identifier;
                        })
                    };
                    if (typeof optional !== 'undefined') {
                        element.optional = optional;
                    }

                    let elements = element.extensionElements;

                    if (!elements) {
                        elements = this.#moddle.create("bpmn:ExtensionElements", {
                            values: []
                        });

                        elements.$parent = element;
                    }

                    let modalities = elements.values.find(value => value.$type == "bpmncns:ExecutionModalities")

                    if (!elements) {
                        modalities = this.#moddle.create("bpmncns:ExecutionModalities", {});
                        modalities.$parent = elements;
                    }

                    for (const [key, value] of Object.entries({
                        standard: "bpmncns:StandardExecutionModality",
                        highPerformance: "bpmncns:HighPerformanceExecutionModality",
                        lowPower: "bpmncns:LowPowerExecutionModality"
                    })) {
                        if (key in handlers) {
                            if (typeof modalities[key] === 'undefined') {
                                modalities[key] = this.#moddle.create(value, handlers[key]);
                            } else {
                                Object.assign(modalities[key], handlers[key]);
                            }
                        }
                    }
                }
            });
        });

        const {
            xml
        } = await this.#moddle.toXML(root, { format: true });

        return this.xml = xml;
    }

    get metadata() {

        return (async () => {

            const services = await this.#services();

            return Object.values(services).map(service => {

                let handlers = this.#handlers(service);

                return (({ identifier: id, name, description, optional }) => ({ id, name, description, optional, handlers }))(service);
            });
        })();
    }

    get feedback() {

        return (async () => {

            const services = await this.#services();

            return Object.values(services).reduce((feedback, service) => {

                let handlers = this.#handlers(service);

                if ("optional" in service) {
                    feedback["overall"]["microservice classification"] += 1 / Object.keys(services).length * 100;
                }
                if (Object.keys(handlers).length) {
                    feedback["overall"]["microservice enrichment"] += 1 / Object.keys(services).length * 100;
                }
                feedback["services"][service.identifier] = {
                    "optional": "optional" in service,
                    "handlers": Object.fromEntries(
                        Object.entries(handlers)
                            .map(([key, _]) => [key, {}])
                    )
                }
                return feedback;
            }, {
                "overall": {
                    "sustainability awareness": 0,
                    "microservice classification": 0,
                    "microservice enrichment": 0
                },
                "services": {}
            });
        })();
    }
}

export default SustainableApplicationModel;