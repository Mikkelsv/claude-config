# Check the Reader Before Calling a Field Removal a Migration

Before classifying the removal of a persisted field as a breaking serialization migration, read the deserializer's unknown-property handling.

## Why

A hand-written converter whose property loop ends in a default arm that skips the value **tolerates unknown properties**. Removing a field from such a type is then a graceful clean break: old payloads still carrying the field load with it dropped — no format-version bump, no migration map, no cascade failure losing the rest of the document. Mis-classifying it adds version gating and back-compat branches the reader already handles for free. The opposite reader, one that throws on unknown properties, genuinely *is* a breaking change — so the policy must be checked, never assumed.

## How

Find the converter's read loop and locate the catch-all arm for unrecognized names.

- **Skips unknowns** → clean break. Add one back-compat test that deserializes an old payload still carrying the removed field and asserts it loads without throwing. That test also locks the skip behaviour against a future "tighten the reader" change.
- **Throws on unknowns** → it IS a migration. Gate by version, or make the reader tolerant first.

Deliberately unscoped: this fires at planning time, when the persistence files may not be open. An instance of `wf-verify-premises-before-acting`.

Tier: always do — when planning a field removal on a persisted type with a hand-written converter.
