import stream from "stream";
import timers from "timers/promises";

class MyReadable extends stream.Transform {
  constructor(options) {
    super(options);

    this.index = 0;
  }

  async _read(size) {
    if (this.index > 1000) {
      process.exit(1);
    }

    await timers.setTimeout(1100);
    this.push(++this.index);
    this.push(++this.index);
    this.push(++this.index);

    if (this.index === 30) {
      for (let index = 0; index < 100; index++) {
        this.push(++this.index);
      }
    }
  }
}

class MyTransform extends stream.Transform {
  constructor(options) {
    const { quantityLimit, timeoutLimit, ...superOptions } = options;
    super(superOptions);

    this.quantityLimit = quantityLimit;
    this.timeoutLimit = timeoutLimit;

    this.counter = 0;
    this.timeoutToken = 0;
    this.chunkList = [];
  }

  _release(origin) {
    if (this.timeoutToken) clearTimeout(this.timeoutToken);
    this.counter = 0;
    this.timeoutToken = 0;

    console.log(origin, typeof this.chunkList, this.chunkList);
    this.push([...this.chunkList]);
    this.chunkList = [];
  }

  _transform(chunk, encoding, callback) {
    this.chunkList.push([chunk, encoding]);
    this.counter++;

    if (this.counter === this.quantityLimit) this._release(`quantity`);
    if (this.timeoutToken) clearTimeout(this.timeoutToken);
    this.timeoutToken = setTimeout(this._release.bind(this), this.timeoutLimit, `timeout`);

    callback();
  }
}

class MyWritable extends stream.Writable {
  constructor(options) {
    super(options);
  }

  _write(chunk, encoding, callback) {
    console.log("write", `${JSON.stringify(chunk)}`);
    callback();
  }
}

const done = err => console.log(`done`, err);

const myReadable = new MyReadable({ objectMode: true });
const myTransform = new MyTransform({ objectMode: true, quantityLimit: 50, timeoutLimit: 1_000 });
const myWritable = new MyWritable({ objectMode: true });

const pipeline = new stream.pipeline(myReadable, myTransform, myWritable, done);
