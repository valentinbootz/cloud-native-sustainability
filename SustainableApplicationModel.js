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

    #modalities(service) {

        if (!('extensionElements' in service)) { return {}; }

        let modalities = (({
            standard,
            highPerformance,
            lowPower
        }) => ({
            standard,
            highPerformance,
            lowPower
        }))(service.extensionElements.values.find(value => value.$type == "sustainability:ExecutionModalities"));

        Object.entries(modalities).forEach(([key, value]) => {
            if (typeof value === 'undefined') delete modalities[key]
            else {
                let requirements = this.#requirements(value);
                modalities[key] = (({ id, name, description }) => ({ id, name, description, requirements }))(value)
            }
        })

        return modalities;
    }

    #requirements(modality) {

        if (!('requirements' in modality)) { return {}; }

        let requirements = (({
            responseTime,
            instanceType
        }) => ({
            responseTime,
            instanceType
        }))(modality.requirements);

        Object.entries(requirements).forEach(([key, value]) => {
            if (typeof value === 'undefined') delete requirements[key]
            else {
                let {
                    $type,
                    ...requirement
                } = value;
                requirements[key] = requirement.value;
            }
        })

        return requirements;
    }

    async update(services, merge = false) {

        const {
            rootElement: root,
        } = await this.#moddle.fromXML(this.xml);

        root.rootElements.map(element => {
            if (element.$type == 'bpmn:Process') {
                element.flowElements.map(element => {
                    if (element.$type == 'bpmn:ServiceTask') {
                        if ('identifier' in element) {
                            let {
                                optional,
                                modalities: update
                            } = {
                                ...services.find(service => {
                                    let {
                                        id
                                    } = service;
                                    return id == element.identifier;
                                })
                            };

                            if (merge) {
                                if (typeof optional !== 'undefined') {
                                    element.optional = optional;
                                }
                            } else { element.optional = optional; }

                            if (typeof update === 'undefined') {
                                update = {};
                            }

                            let elements = element.extensionElements;

                            if (!elements) {
                                elements = this.#moddle.create("bpmn:ExtensionElements", {
                                    values: []
                                });

                                elements.$parent = element;
                            }

                            let modalities;

                            let index = elements.values.findIndex(value => value.$type == "sustainability:ExecutionModalities");
                            if (merge) {
                                modalities = elements.values[index];
                            }

                            for (const [key, value] of Object.entries({
                                standard: "sustainability:StandardExecutionModality",
                                highPerformance: "sustainability:HighPerformanceExecutionModality",
                                lowPower: "sustainability:LowPowerExecutionModality"
                            })) {
                                if (key in update) {

                                    if (typeof modalities === 'undefined') {
                                        modalities = this.#moddle.create("sustainability:ExecutionModalities", {});
                                        modalities.$parent = elements;
                                    }

                                    let current;
                                    if (merge && key in modalities) {
                                        current = modalities[key]
                                    } else {
                                        current = {};
                                    }

                                    let requirements;
                                    if (merge) {
                                        requirements = current.requirements;
                                    }
                                    if ('requirements' in update[key]) {
                                        let {
                                            requirements: props
                                        } = update[key];
                                        if (typeof requirements === 'undefined') {
                                            requirements = this.#moddle.create("sustainability:ServiceRequirements", {});
                                        }
                                        for (const [key, value] of Object.entries({
                                            responseTime: "sustainability:ResponseTimeRequirement",
                                            instanceType: "sustainability:InstanceTypeRequirement",
                                        })) {
                                            if (typeof props[key] === 'undefined') break;
                                            let requirement = this.#moddle.create(value, {value: props[key]});
                                            requirement.$parent = requirements;
                                            requirements[key] = requirement;
                                        }
                                    }

                                    let props = (({ id, name, description }) => ({ id, name, description, requirements }))({
                                        ...current, ...update[key]
                                    })
                                    modalities[key] = this.#moddle.create(value, props);
                                }
                            }
                            if (index !== -1) { elements.values[index] = modalities; }
                            else { elements.values.push(modalities); }
                            element.extensionElements = elements;
                        }
                    }
                });
            }
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

                let modalities = this.#modalities(service);

                let { optional } = service;
                optional = optional || null;

                return (({ identifier: id, name }) => ({ id, name, optional, modalities }))(service);
            });
        })();
    }

    get feedback() {

        return (async () => {

            const services = await this.#services();

            return Object.values(services).reduce((feedback, service) => {

                let modalities = this.#modalities(service);

                if ("optional" in service) {
                    feedback["scores"]["microservice classification"] += 1 / Object.keys(services).length * 100;
                }
                if (Object.keys(modalities).length > 1) {
                    feedback["scores"]["microservice enrichment"] += 1 / Object.keys(services).length * 100;
                }
                if (Object.keys(modalities).length && Object.values(modalities).every(modality => {
                    let requirements = modality.requirements;
                    if (typeof requirements === 'undefined') { return false; }
                    else { return (Object.keys(requirements).length); }
                })) {
                    feedback["scores"]["sustainability awareness"] += 1 / Object.keys(services).length * 100;
                }
                feedback["services"][service.identifier] = {
                    "optional": "optional" in service,
                    "modalities": Object.fromEntries(
                        Object.entries(modalities)
                            .map(([key, value]) => {
                                let modality = (({ requirements }) => ({ requirements }))(value)
                                return [key, modality]
                            })
                    )
                }
                return feedback;
            }, {
                "scores": {
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