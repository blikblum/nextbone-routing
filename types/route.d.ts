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
 * @overload
 * @param {Object} target
 * @param {string} propertyKey
 * @returns {void}
 *
 * @overload
 * @param {{from?: string | PropertyHook, to?: string | PropertyHook, format?: 'number' | (any) => any}} optionsOrProtoOrDescriptor
 * @returns {(target: Object, propertyKey: string | symbol) => void}
 */
export function property(target: any, propertyKey: string): void;
/**
 * @overload
 * @param {Object} target
 * @param {string} propertyKey
 * @returns {void}
 *
 * @overload
 * @param {{from?: string | PropertyHook, to?: string | PropertyHook, format?: 'number' | (any) => any}} optionsOrProtoOrDescriptor
 * @returns {(target: Object, propertyKey: string | symbol) => void}
 */
export function property(optionsOrProtoOrDescriptor: {
    from?: string | PropertyHook;
    to?: string | PropertyHook;
    format?: "number" | ((any: any) => any);
}): (target: any, propertyKey: string | symbol) => void;
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
    /**
     * @param {HTMLElement} el
     */
    createOutlet(el: HTMLElement): Region;
    getOutlet(): any;
    destroy(): void;
}
export type PropertySetter = (value: any) => void;
export type PropertyHook = {
    init?: (setter: PropertySetter) => void;
    enter?: (transition: Transition, setter: PropertySetter) => void;
    transition?: (transition: Transition, setter: PropertySetter) => void;
    leave?: (transition: Transition, setter: PropertySetter) => void;
    update?: (value: any, el: HTMLElement) => void;
};
import { Events } from 'nextbone';
import type { Transition } from 'slick-router/core.js';
import { Region } from 'nextbone/dom-utils';
//# sourceMappingURL=route.d.ts.map