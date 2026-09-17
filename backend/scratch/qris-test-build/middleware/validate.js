"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../shared/errors");
function validate(schema, source = 'body') {
    return (req, _res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new errors_1.ValidationError(messages));
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=validate.js.map