import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent, shouldRefuse, tryDeterministicAnswer, buildRefusalResponse, buildGuardrailInstructions } from '../api/_guardrails.js';

describe('_guardrails', () => {
  describe('classifyIntent', () => {
    it('classifies compliance questions', () => {
      assert.equal(classifyIntent('When is my annual report deadline?'), 'COMPLIANCE_FACT');
      assert.equal(classifyIntent('How much is the filing fee?'), 'COMPLIANCE_FACT');
      assert.equal(classifyIntent('What happens if I miss the deadline?'), 'COMPLIANCE_FACT');
    });

    it('classifies legal questions', () => {
      assert.equal(classifyIntent('Should I sue my former partner?'), 'LEGAL_QUESTION');
      assert.equal(classifyIntent('Am I liable for this contract breach?'), 'LEGAL_QUESTION');
      assert.equal(classifyIntent('What are my legal rights here?'), 'LEGAL_QUESTION');
    });

    it('classifies billing questions', () => {
      assert.equal(classifyIntent('What is the pricing for plans?'), 'BILLING_QUESTION');
      assert.equal(classifyIntent('Cancel my subscription'), 'BILLING_QUESTION');
    });

    it('classifies action requests', () => {
      assert.equal(classifyIntent('How do I upload a document?'), 'ACTION_REQUEST');
      assert.equal(classifyIntent('Show my entities'), 'ACTION_REQUEST');
    });

    it('returns GENERAL_QUESTION for unmatched', () => {
      assert.equal(classifyIntent('Hello!'), 'GENERAL_QUESTION');
      assert.equal(classifyIntent(''), 'GENERAL_QUESTION');
      assert.equal(classifyIntent(null), 'GENERAL_QUESTION');
    });
  });

  describe('shouldRefuse', () => {
    it('refuses legal questions', () => {
      assert.ok(shouldRefuse('LEGAL_QUESTION'));
    });

    it('allows other intents', () => {
      assert.ok(!shouldRefuse('COMPLIANCE_FACT'));
      assert.ok(!shouldRefuse('BILLING_QUESTION'));
      assert.ok(!shouldRefuse('GENERAL_QUESTION'));
    });
  });

  describe('buildRefusalResponse', () => {
    it('returns structured refusal', () => {
      const r = buildRefusalResponse();
      assert.ok(r.answer.includes('attorney'));
      assert.equal(r.confidence, 1.0);
    });
  });

  describe('tryDeterministicAnswer', () => {
    it('answers deadline questions', () => {
      const result = tryDeterministicAnswer('When is my filing deadline?', { entityType: 'LLC' });
      assert.ok(result);
      assert.ok(result.answer.length > 0);
      assert.equal(result.confidence, 1.0);
      assert.ok(result.sources.length > 0);
    });

    it('answers fee questions', () => {
      const result = tryDeterministicAnswer('How much is the annual report fee?', { entityType: 'Corporation' });
      assert.ok(result);
      assert.ok(result.answer.includes('$'));
    });

    it('returns null for non-deterministic questions', () => {
      const result = tryDeterministicAnswer('Tell me about your services', {});
      assert.equal(result, null);
    });
  });

  describe('buildGuardrailInstructions', () => {
    it('returns instructions with required rules', () => {
      const instructions = buildGuardrailInstructions();
      assert.ok(instructions.includes('CITATION'));
      assert.ok(instructions.includes('LEGAL BOUNDARY'));
      assert.ok(instructions.includes('NO INVENTION'));
    });
  });
});
