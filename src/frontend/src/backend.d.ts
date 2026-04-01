import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface EventStats {
    totalEvents: bigint;
    halvings: bigint;
    crises: bigint;
    macroEvents: bigint;
    fedEvents: bigint;
}
export interface Event {
    id: bigint;
    title: string;
    priceAtEvent: number;
    date: string;
    priceImpactPercent: number;
    description: string;
    eventType: EventType;
}
export interface PricePoint {
    date: string;
    volume: number;
    price: number;
}
export interface NextEvent {
    title: string;
    description: string;
    estimatedDate: string;
}
export interface SimilarPeriod {
    endDate: string;
    period: string;
    description: string;
    priceChangePercent: number;
    startDate: string;
}
export interface AnticipationAnalysis {
    historicalPatternSummary: string;
    expectedMaxMultiplier: number;
    expectedMinMultiplier: number;
    nextEvent: NextEvent;
    summary: string;
}
export interface ContextAnalysis {
    mostSimilarPeriod: SimilarPeriod;
    percentFromATH: number;
    cyclePhase: string;
    daysSinceLastHalving: bigint;
    keySummary: string;
}
export enum EventType {
    macro = "macro",
    halving = "halving",
    fedEvent = "fedEvent",
    crisis = "crisis"
}
export interface backendInterface {
    analyzeAnticipation(): Promise<AnticipationAnalysis>;
    analyzeCurrentContext(): Promise<ContextAnalysis>;
    getEventStats(): Promise<EventStats>;
    getEvents(): Promise<Array<Event>>;
    getPriceWindow(startDate: string, endDate: string): Promise<Array<PricePoint>>;
}
