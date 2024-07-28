/**
 *
 * @param {string} path
 * @param {string | Function} format
 * @returns {PropertyHook}
 */
export function fromTransition(path: string, format: string | Function): PropertyHook;
/**
 * @param {string} eventName
 * @returns {(target: any, propertyKey: string, descriptor: PropertyDescriptor) => void}
 */
export function elEvent(eventName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
/**
 * @param {*} options
 * @returns {(target: Object, propertyKey: string | symbol) => void}
 */
export function property(optionsOrProtoOrDescriptor: any, fieldName: any, options: any): (target: any, propertyKey: string | symbol) => void;
export function getComponent(route: any): any;
/**
 * @param {string} eventName
 * @returns {(target: any, propertyKey: string, descriptor: PropertyDescriptor) => void}
 */
export function eventHandler(eventName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export class Route extends Events {
    constructor(classOptions: any, router: any, { name, path, options }: {
        name: any;
        path: any;
        options: any;
    });
    $router: any;
    $name: any;
    $path: any;
    $options: any;
    _propertiesData: {};
    initialize(): void;
    /**
     * @param {Transition} transition
     */
    activate(transition: Transition): void;
    /**
     * @param {Transition} transition
     */
    deactivate(transition: Transition): void;
    _initInstanceProperties(): void;
    _applyProperties(el: any, transition: any, $route: any): void;
    /**
     * @param {HTMLElement} el
     * @param {Transition} transition
     * @param {*} $route
     */
    _prepareEl(el: HTMLElement, transition: Transition, $route: any): void;
    renderEl(region: any, transition: any, $route: any): void;
    el: any;
    updateEl(): void;
    get context(): any;
    createOutlet(el: any): Region;
    getOutlet(): any;
    destroy(): void;
}
export type PropertySetter = (value: any) => void;
export type PropertyHook = {
    init?: (arg0: PropertySetter) => void;
    enter?: (arg0: Transition, arg1: PropertySetter) => void;
    transition?: (arg0: Transition, arg1: PropertySetter) => void;
    leave?: (arg0: Transition, arg1: PropertySetter) => void;
    update?: (arg0: any, arg1: HTMLElement) => void;
};
import { Events } from 'nextbone';
import type { Transition } from 'slick-router/core.js';
import { Region } from 'nextbone/dom-utils';
//# sourceMappingURL=route.d.ts.map