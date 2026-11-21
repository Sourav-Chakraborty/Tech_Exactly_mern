import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";

// Minimal Express req/res doubles for middleware unit tests.

export const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({ headers: {}, params: {}, query: {}, body: {}, get: () => undefined, ...overrides }) as unknown as Request;

export const mockRes = () => {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    locals: Record<string, unknown>;
    body?: unknown;
    status: jest.Mock;
    json: jest.Mock;
  };
  res.statusCode = 200;
  res.locals = {};
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  return res as typeof res & Response;
};

export const mockNext = () => jest.fn() as jest.Mock & NextFunction;
