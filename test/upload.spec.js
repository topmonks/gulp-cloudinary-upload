import {join} from 'path';
import test from 'ava';
import uuidv4 from 'uuid/v4';
import pEvent from 'p-event';
import {readFileSync, createReadStream} from 'fs';
import {v2 as cloudinary} from 'cloudinary';
import Vinyl from 'vinyl';
import m from '..';

const createFixture = async options => {
  options = options || {};
  const params = Object.assign({}, options.params);
  const stream = m({params});
  const data = pEvent(stream, 'data');

  const fixturePath = join(__dirname, 'fixtures/redpixel.png');
  const fixtureContents = options.streaming
    ? createReadStream(fixturePath)
    : readFileSync(fixturePath);

  stream.end(
    new Vinyl({
      path: join(process.cwd(), `src/images/${options.publicID}.png`),
      contents: fixtureContents
    })
  );

  const file = await data;

  return file;
};

test.beforeEach(t => {
  t.context.publicID = uuidv4();
});

test.afterEach(async t => {
  t.plan(1);

  try {
    await cloudinary.uploader.destroy(t.context.publicID);
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test('uploads images in Buffer mode', async t => {
  t.plan(2);

  const file = await createFixture({publicID: t.context.publicID});

  t.true(file.isBuffer());
  try {
    await cloudinary.api.resource(file.stem);
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test('uploads images in Streaming mode', async t => {
  t.plan(2);

  const file = await createFixture({
    publicID: t.context.publicID,
    streaming: true
  });

  t.true(file.isStream());
  try {
    await cloudinary.api.resource(file.stem);
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test('stores the upload response for later', async t => {
  t.plan(1);

  const file = await createFixture({publicID: t.context.publicID});

  t.truthy(file.cloudinary);
});

test('overrides `original_filename` in the upload response', async t => {
  t.plan(1);

  const file = await createFixture({publicID: t.context.publicID});

  t.is(file.cloudinary.original_filename, file.stem);
});

test('allows overwriting images', async t => {
  t.plan(1);

  await cloudinary.uploader.upload('test/fixtures/redpixel.png', {
    public_id: t.context.publicID
  });

  const file = await createFixture({
    publicID: t.context.publicID,
    params: {overwrite: true}
  });

  t.true(file.cloudinary.overwritten);
});

test('does not overwrite images by default', async t => {
  t.plan(1);

  await cloudinary.uploader.upload('test/fixtures/redpixel.png', {
    public_id: t.context.publicID
  });

  const file = await createFixture({publicID: t.context.publicID});

  t.falsy(file.cloudinary.overwritten);
});

test('accepts upload options', async t => {
  t.plan(1);

  const file = await createFixture({
    publicID: t.context.publicID,
    params: {tags: ['gulp-cloudinary-upload']}
  });

  t.is(file.cloudinary.tags[0], 'gulp-cloudinary-upload');
});
