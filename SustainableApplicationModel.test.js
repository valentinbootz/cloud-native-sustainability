import SustainableApplicationModel from './SustainableApplicationModel.js';

import feedback from './feedback.json';
import metadata from './metadata.json';
import services from './services.json';

import fs from 'fs';
const initial = fs.readFileSync('./initial-model.xml', 'utf8');
const update = fs.readFileSync('./update-model.xml', 'utf8');
const merge = fs.readFileSync('./merge-model.xml', 'utf8');

let model;

beforeEach(() => {
    model = new SustainableApplicationModel(initial);
});

describe('sustainable application model', () => {

    test('sustainability feedback', async () => {
        expect(await model.feedback).toEqual(feedback);
    });

    test('service metadata', async () => {
        expect(await model.metadata).toEqual(metadata);
    });

    describe('update metadata', () => {
        test('default', async () => {
            expect(await model.update(services)).toEqual(update);
        });

        test('merge', async () => {
            expect(await model.update(services, merge)).toEqual(merge);
        });
    });
});