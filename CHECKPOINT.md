[Checkpoint 1](#checkpoint-report-of-team-20---milestone-1) - **March 9th 2021**

[Checkpoint 2](#checkpoint-report-of-team-20---milestone-2) - **March 29th 2021**

[Checkpoint 3](#checkpoint-report-of-team-20---milestone-3) - **May 26th 2021**



# Checkpoint Report of Team 20 - Milestone 1

Following general tasks are being performed as part of checkpoint 1

## Automatically configure a jenkins server - Sharath (sbangal2)

Tasks Completed:

- Wrote Ansible scripts to install jenkins, suggested plugins and bypassing user authentication using groovy script on the build server

Tasks for next checkpoint:

- Turning off jenkins setup wizard

- Configure server to trigger build jobs for checkbox.io

## Automatically configure a build environment (checkbox.io) - Niranjan (nrpandes)

Tasks Completed:

- Wrote and tested ansible script to install mongodb on config-srv

Tasks for next checkpoint:

- Create a build environment for checkbox.io

- Create mongo user with password and readWrite role

- Define APP_PORT=3002,MONGO_PORT=27017, MONGO_USER=<user>, MONGO_PASSWORD=<pass>, and MONGO_IP=localhost

## Create a build job for jenkins - Mangalnathan (mvijaya2)

Tasks Completed:

- Extended setup.js to install ansible on spawned build server and run the ansible scripts to install jenkins, nodejs, npm, mongodb and java.

Tasks for next checkpoint:

- Build job clones https://github.com/chrisparnin/checkbox.io

- Build job installs npm modules

- Start mongodb (if not already running as service)

- Start server-side/site/server.js

- Successfully pass npm test (as provided in server-side/site/package.json)

## Known issues:

While installing one of the plugin through build-pipeline-plugin, we are getting timeout issues. It runs successfully when the install is executed for the second time.

<img src="Images/Plugin_install_error.png" width="950" height="50" title="error">

We tried rectifying it with the suggested [link](https://stackoverflow.com/questions/42219781/gets-error-cannot-get-csrf-when-trying-to-install-jenkins-plugin-using-ansible/42224672#42224672)

We will try to address this issue in the next checkpoint.


## Project Board - Checkpoint 1

View project board [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/projects/1)

<img src="Images/checkpoint1.PNG" title="cp1">

<br />

# Checkpoint Report of Team 20 - Milestone 2

Following general tasks are being performed as part of milestone 2

## Automatically configure a build environment and build job for a Java application (iTrust) - Sharath (sbangal2)

Tasks Completed:

- Creating build environment for iTrust2-v8. For running iTrust we needs few dependencies to be installed on the config-srv. Ansible scripts were written to install following dependencies.
  - Installation of python3 pip
  - Maven
  - MySQL
  - git gh-username and gh-password stored in environment file (Used for cloning the iTrust from git repo)
  - Installation of goolge chrome
  - Accepting --gh-user <username> --gh-pass <password> from pipeline setup command as a parameter.

Tasks for next checkpoint:
-  iTrust Build Job.
-  Enhance pipeline build to accept following parameter iTrust -u <admin> -p <admin> (github credentials.)
-  Implement cleanup function after the build job.

## Implement a test suite analysis for detecting useful tests - Niranjan (nrpandes)

Tasks Completed:

- swap "==" with "!="
- swap 0 with 1
- change content of "strings" in code
- swap "<" with ">"

Tasks for next checkpoint:

- 2 more mutation operations of our choice
- Generate 1000 test suite runs
- Run units tests with mvn clean test
- Record which test cases have failed, and which have passed
- Reset code, drop database, discarding your changes


## Implement a static analysis for detecting code smells - Mangalnathan (mvijaya2)

Tasks Completed:

- Implemented and tested static analysis to detect:
  - Long method: Detect long methods (>100 LOC).
  - Message Chains: Detect message chains (for `.`) (> 10 chains)
  - Report violations immediately if found

Tasks for next checkpoint:

- Implement and test static analysis for MaxNestingDepth: Count max depth of if statements in a function (> 5)

- Report all violations discovered in static analysis.

- Build checkbox.io and fail build in case of any violations of given metrics

  


## Project Board - Checkpoint 2

View project board [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/projects/1)

![image](https://media.github.ncsu.edu/user/16849/files/ea9f1180-90ac-11eb-9e3a-ebca5e815ea6)



# Checkpoint Report of Team 20 - Milestone 3

Following general tasks are being performed as part of Milestone 3

## Provision Cloud Instances and setup Monitoring Infrastructure - Sharath (sbangal2)

- For provisioning the cloud instances we are using digital ocean cloud provider. 
- Tasks completed:
  - Virtual Machines were successfully spawned in the cloud provider - digital ocean.
  - prod.js file updated to configure the instances on digital ocean using 'pipeline prod up' command.
  - Ansible script to create SSH private and public key in the config-srv.
- Tasks to be completed:
  - Populate the inventory file with iTrust, Checkbox.io and Monitor IP dynamically.
  - Implement a monitor VM with a dashboard that can report metrics associated with the deployed applications. 
  - Collection of metrics of all the instances spawned in digital ocean.



## Implement deployment to cloud instances - Mangalnathan (mvijaya2)

- Tasks completed:
  - Extend jenkins build job to create a war file for deployment.
  - Logic to copy the SSH public key of config-srv to all the cloud instances.
- Tasks to be completed:
  - Setup tomcat server in production environment to deploy iTrust.
  - Install dependencies in production server.
  - Configure nginx to serve the static website content



## Implement canary analysis - Niranjan (nrpandes)

* In Progress:
  * Prepare monitoring dashboard to perform canary analysis.
* Tasks completed:
  * Added memory/CPU metrics.
  * Added Latency and HTTP status codes.
* Tasks to be completed:
  * Construct a computing environment with three VMs.
  * Generate load to the proxy server by requesting the `/preview` service.
  * For the first 1 minute, send the load to the blue instance, collect health metrics.
  * Next, send traffic to the green instance for 1 minute, collect health metrics.
  * Report a statistical comparison between health values and compute a canary score

## Project Board - Checkpoint 3

View project board [here](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-20/projects/1)

![image](https://media.github.ncsu.edu/user/16849/files/a708e900-a6e6-11eb-935c-cd3b5b1775ef)
