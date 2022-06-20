const {Translate} = require('@google-cloud/translate').v2;
require('dotenv').config()

const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS ?? "")
const translate = new Translate({
    credentials: CREDENTIALS,
    projectId: CREDENTIALS.project_id
})

/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
const text = 'Hello, world!';
const target = 'it';

(async () =>{
  const [translation] = await translate.translate(text, target);
  console.log(translation)
})();
