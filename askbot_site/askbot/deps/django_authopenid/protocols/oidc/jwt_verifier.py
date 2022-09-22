from okta_jwt_verifier import BaseJWTVerifier

class JwtVerifier(BaseJWTVerifier):
    """Wrapper around the `BaseJwtVerifier`
    main purpose is to allow passing the `jwks_uri`
    and not be making an assumption about the url structure.
    """

    def __init__(self,
                 issuer=None,
                 client_id=None,
                 jwks_uri=None,
                 audience=None,
                 max_retries=1,
                 request_timeout=30,
                 max_requests=10,
                 leeway=120,
                 cache_jwks=True,
                 proxy=None):

        self.jwks_uri = jwks_uri
        super().__init__(issuer=issuer,
                         client_id=client_id,
                         audience=audience,
                         max_retries=max_retries,
                         request_timeout=request_timeout,
                         max_requests=max_requests,
                         leeway=leeway,
                         cache_jwks=cache_jwks,
                         proxy=proxy)

    def _construct_jwks_uri(self):
        """Bypasses the okta assumptions"""
        return self.jwks_uri
