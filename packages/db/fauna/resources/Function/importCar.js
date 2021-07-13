import fauna from 'faunadb'

const {
  Function,
  CreateFunction,
  Query,
  Lambda,
  Let,
  Match,
  Index,
  Select,
  Var,
  If,
  Create,
  Update,
  Exists,
  Now,
  Get,
  Ref,
  IsNonEmpty,
  Abort,
  Collection,
  IsNull,
  Not,
  Do,
  Call,
  Foreach
} = fauna

const name = 'importCar'
const body = Query(
  Lambda(
    ['data'],
    Let(
      {
        userRef: Ref(Collection('User'), Select('user', Var('data'))),
        authTokenRef: If(
          IsNull(Select('authToken', Var('data'), null)),
          null,
          Ref(Collection('AuthToken'), Select('authToken', Var('data')))
        )
      },
      If(
        Not(Exists(Var('userRef'))),
        Abort('user not found'),
        Let(
          {
            cid: Select('cid', Var('data')),
            contentMatch: Match(Index('unique_Content_cid'), Var('cid'))
          },
          If(
            IsNonEmpty(Var('contentMatch')),
            Let(
              {
                content: Get(Var('contentMatch')),
                uploadMatch: Match(
                  Index('upload_by_user_and_content'),
                  Var('userRef'),
                  Select('ref', Var('content')),
                  true
                )
              },
              If(
                IsNonEmpty(Var('uploadMatch')),
                Get(Var('uploadMatch')),
                Let(
                  {
                    upload: Create('Upload', {
                      data: {
                        user: Var('userRef'),
                        authToken: Var('authTokenRef'),
                        content: Select('ref', Var('content')),
                        name: Select('name', Var('data'), null),
                        created: Now()
                      }
                    })
                  },
                  Do(
                    Foreach(
                      Select('pins', Var('data')),
                      Lambda(
                        ['pin'],
                        Call('createPinAndLocation', {
                          content: Select(['ref', 'id'], Var('content')),
                          status: Select('status', Var('pin')),
                          location: Select('location', Var('pin'))
                        })
                      )
                    ),
                    Var('upload')
                  )
                )
              )
            ),
            Let(
              {
                content: Create('Content', {
                  data: {
                    cid: Var('cid'),
                    dagSize: Select('dagSize', Var('data'), null),
                    created: Now()
                  }
                }),
                upload: Create('Upload', {
                  data: {
                    user: Var('userRef'),
                    authToken: Var('authTokenRef'),
                    content: Select('ref', Var('content')),
                    name: Select('name', Var('data'), null),
                    created: Now()
                  }
                })
              },
              Do(
                Foreach(
                  Select('pins', Var('data')),
                  Lambda(
                    ['pin'],
                    Call('createPinAndLocation', {
                      content: Select(['ref', 'id'], Var('content')),
                      status: Select('status', Var('pin')),
                      location: Select('location', Var('pin'))
                    })
                  )
                ),
                Var('upload')
              )
            )
          )
        )
      )
    )
  )
)

export default If(
  Exists(Function(name)),
  Update(Function(name), { name, body }),
  CreateFunction({ name, body })
)
