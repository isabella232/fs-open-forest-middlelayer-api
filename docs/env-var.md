## Environment Variables
These are the environment variables that must be created on the Node.js server for the application to run:

- `DATABASE_URL=postgres://<username>:<password>@<database hostname>:5432<database name>`
- `JWT_SECRET_KEY=<secret key to generate tokens>`
- `ADMINROLE_USER=<admin role account username>`
- `ADMINROLE_PWD=<admin role account password>`
- `ADMINROLE_HASH=<admin role account password’s hash generated by bcrypt>`
- `USERROLE_USER=<user role account username>`
- `USERROLE_PWD=<user role account password>`
- `USERROLE_HASH=<user role account password’s hash generated by bcrypt>`
- `AWS_ACCESS_KEY_ID=<AWS access key ID>`
- `AWS_SECRET_ACCESS_KEY=<AWS secret key>`
- `AWS_REGION=<AWS region>`
- `AWS_BUCKET_NAME=<AWS S3 bucket name>`
- `BASICURL=<SUDS Basic API URL>`