class ErrorGetWords {
	constructor() {
		this.ReadError = class extends Error {
			constructor() {
				super(`getWords: Failed to read from ${__dirname}//stuff//words.txt`);
				Error.captureStackTrace(this, ErrorGetWords);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`getWords: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorGetWords);
			}
		};
	}
}

class ErrorGetHashtags {
	constructor() {
		this.ReadError = class extends Error {
			constructor() {
				super(`getHashtags: Failed to read from ${__dirname}//stuff//hashtags.txt`);
				Error.captureStackTrace(this, ErrorGetHashtags);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`getHashtags: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorGetHashtags);
			}
		};
	}
}

class ErrorIncrementIndex {
	constructor() {
		this.WriteError = class extends Error {
			constructor() {
				super(`incrementIndex: Failed to write to ${__dirname}//stuff//.index`);
				Error.captureStackTrace(this, ErrorIncrementIndex);
			}
		};
		this.ReadError = class extends Error {
			constructor() {
				super(`incrementIndex: Failed to read from ${__dirname}//stuff//.index`);
				Error.captureStackTrace(this, ErrorIncrementIndex);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`incrementIndex: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorIncrementIndex);
			}
		};
	}
}

class ErrorGetIndex {
	constructor() {
		this.WriteError = class extends Error {
			constructor() {
				super(`getIndex: Failed to write to ${__dirname}//stuff//.index`);
				Error.captureStackTrace(this, ErrorGetIndex);
			}
		};
		this.ReadError = class extends Error {
			constructor() {
				super(`getIndex: Failed to read from ${__dirname}//stuff//.index`);
				Error.captureStackTrace(this, ErrorGetIndex);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`getIndex: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorGetIndex);
			}
		};
	}
}

class ErrorDoesImageExistIG {
	constructor() {
		this.EmptyURL = class extends Error {
			constructor() {
				super('doesImageExistIG: Empty input URL');
				Error.captureStackTrace(this, ErrorDoesImageExistIG);
			}
		};
		this.NotFound = class extends Error {
			constructor() {
				super('doesImageExistIG: Something went wrong, image doesn\'t exist');
				Error.captureStackTrace(this, ErrorDoesImageExistIG);
			}
		};
		this.Timeout = class extends Error {
			constructor() {
				super('doesImageExistIG: Timed-out');
				Error.captureStackTrace(this, ErrorDoesImageExistIG);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`doesImageExistIG: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorDoesImageExistIG);
			}
		};
	}
}

class ErrorLoginIG {
	constructor() {
		this.NullResponse = class extends Error {
			constructor() {
				super('loginIG: Validation response is empty');
				Error.captureStackTrace(this, ErrorLoginIG);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`loginIG: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorLoginIG);
			}
		};
	}
}

class ErrorUploadIG {
	constructor() {
		this.NotOK = class extends Error {
			constructor() {
				super('uploadIG: Response status is not OK');
				Error.captureStackTrace(this, ErrorUploadIG);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`uploadIG: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorUploadIG);
			}
		};
	}
}

class ErrorGetRemainingTreeAmount {
	constructor() {
		this.HTTP = class extends Error {
			constructor(...args) {
				super(`getRemainingTreeAmount: HTTP Error (is the website down?): ${args}`);
				Error.captureStackTrace(this, ErrorGetRemainingTreeAmount);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`getRemainingTreeAmount: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorGetRemainingTreeAmount);
			}
		};
	}
}

class ErrorLoop {
	constructor() {
		this.IncorrectLastAchievedMilestone = class extends Error {
			constructor(...args) {
				super(`loop: Discrepancy detected: ${args}`);
				Error.captureStackTrace(this, ErrorLoop);
			}
		};
		this.Unknown = class extends Error {
			constructor(...args) {
				super(`loop: Unknown Error: ${args}`);
				Error.captureStackTrace(this, ErrorLoop);
			}
		};
	}
}

module.exports = {
	'ErrorUploadIG': new ErrorUploadIG(),
	'ErrorDoesImageExistIG': new ErrorDoesImageExistIG(),
	'ErrorGetIndex': new ErrorGetIndex(),
	'ErrorIncrementIndex': new ErrorIncrementIndex(),
	'ErrorGetHashtags': new ErrorGetHashtags(),
	'ErrorGetWords': new ErrorGetWords(),
	'ErrorGetRemainingTreeAmount': new ErrorGetRemainingTreeAmount(),
	'ErrorLoop': new ErrorLoop(),
	'ErrorLoginIG': new ErrorLoginIG()
};
